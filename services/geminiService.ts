
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CycleReport, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-3-flash-preview";

// Caching mechanisms
const behavioralCache = new Map<string, { data: any; timestamp: number }>();
const reportCache = new Map<string, { data: CycleReport; timestamp: number }>();
const queryCache = new Map<string, { data: string; timestamp: number }>();

const CACHE_TTL = 1000 * 60 * 15; // 15 phút cho phân tích và báo cáo
const QUERY_CACHE_TTL = 1000 * 60 * 10; // 10 phút cho các câu hỏi phổ biến

/**
 * Tạo fingerprint định danh trạng thái dữ liệu hiện tại
 */
const getTransactionsFingerprint = (transactions: Transaction[]) => {
  if (transactions.length === 0) return "empty";
  const lastId = transactions[0]?.id || "none";
  const sum = transactions.reduce((acc, t) => acc + t.amount, 0);
  return `${transactions.length}-${lastId}-${sum}`;
};

/**
 * Nén dữ liệu giao dịch để tối ưu hóa token và tốc độ xử lý của AI
 */
const compressContext = (transactions: Transaction[], limit: number = 40) => {
  return transactions.slice(0, limit).map(t => ({
    l: t.type === 'INCOME' ? 'T' : 'C', // T: Thu, C: Chi
    a: t.amount,
    c: t.category.slice(0, 3), // Lấy 3 ký tự đầu danh mục
    d: t.date.split('T')[0].slice(5), // Chỉ lấy MM-DD
    n: t.note?.slice(0, 15) // Rút gọn ghi chú
  }));
};

/**
 * Mô phỏng luồng trả về (Stream) từ dữ liệu cache
 */
async function* createCachedStream(text: string) {
  // Trả về một chunk duy nhất chứa toàn bộ text để UI xử lý ngay lập tức
  yield { text };
}

/**
 * Persona: AI Tài Chính SMART MONEY - NHATTU SJC
 */
export const analyzeBehavioralFinances = async (transactions: Transaction[]) => {
  if (transactions.length === 0) return null;

  const fingerprint = getTransactionsFingerprint(transactions);
  const cached = behavioralCache.get(fingerprint);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.debug("[FOS Cache] Hit: Behavioral Analysis");
    return cached.data;
  }

  const systemInstruction = `Bạn là AI SMART MONEY - NHATTU SJC. Phân tích tài chính súc tích.
  - Dự báo: run_out_date (YYYY-MM-DD hoặc 'SAFE').
  - Insight: 1 câu cực ngắn.
  - Projection: text ngắn.
  - Causes/Actions: List string.
  JSON duy nhất.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Dữ liệu nén: ${JSON.stringify(compressContext(transactions))}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            behavior_insight: { type: Type.STRING },
            run_out_date: { type: Type.STRING },
            projection_summary: { type: Type.STRING },
            causes: { type: Type.ARRAY, items: { type: Type.STRING } },
            preventive_actions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["behavior_insight", "run_out_date", "projection_summary", "causes", "preventive_actions"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    behavioralCache.set(fingerprint, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error("Lỗi phân tích FOS:", error);
    return null;
  }
};

/**
 * Trình truy vấn dữ liệu Terminal với cơ chế Cache Stream
 */
export const queryFinancialDataStream = async (query: string, transactions: Transaction[], archives: any[] = []) => {
  const dataFingerprint = getTransactionsFingerprint(transactions);
  const cacheKey = `${query.trim().toLowerCase()}-${dataFingerprint}`;
  
  const cached = queryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < QUERY_CACHE_TTL)) {
    console.debug("[FOS Cache] Hit: Query Stream");
    return createCachedStream(cached.data);
  }

  const context = {
    now: new Date().toISOString().split('T')[0],
    data: compressContext(transactions, 30),
    hist: archives.slice(-2).map(a => `${a.cycleId}: ${a.report?.summary?.slice(0, 30)}`)
  };

  const systemInstruction = `Bạn là AI SMART MONEY - NHATTU SJC. Trả lời truy vấn tài chính. 
  Markdown, tiếng Việt. In đậm số tiền. Cực kỳ ngắn gọn, bỏ qua chào hỏi.`;

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: `Context: ${JSON.stringify(context)}. Query: "${query}"`,
      config: { 
        systemInstruction,
        temperature: 0.1 // Thấp để tăng tính nhất quán và tốc độ
      }
    });

    // Tạo wrapper để lưu lại kết quả hoàn chỉnh vào cache sau khi stream kết thúc
    return (async function* () {
      let fullText = "";
      for await (const chunk of stream) {
        const text = chunk.text;
        fullText += text;
        yield chunk;
      }
      if (fullText) {
        queryCache.set(cacheKey, { data: fullText, timestamp: Date.now() });
      }
    })();
  } catch (error) {
    console.error("Lỗi truy vấn FOS:", error);
    throw error;
  }
};

/**
 * Báo cáo tổng kết chu kỳ
 */
export const generateCycleReport = async (currentData: Transaction[], prevCycleSummary?: string): Promise<CycleReport | null> => {
  const fingerprint = `report-${getTransactionsFingerprint(currentData)}`;
  const cached = reportCache.get(fingerprint);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  const systemInstruction = `Tạo báo cáo chốt sổ. JSON, Tiếng Việt. Súc tích, tập trung vào con số và giải pháp.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Data: ${JSON.stringify(compressContext(currentData, 50))}. Prev: ${prevCycleSummary || 'N/A'}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            stats: {
              type: Type.OBJECT,
              properties: {
                totalIncome: { type: Type.NUMBER },
                totalExpense: { type: Type.NUMBER },
                balance: { type: Type.NUMBER },
                financialScore: { type: Type.NUMBER },
                bestCategory: { type: Type.STRING },
                worstCategory: { type: Type.STRING },
                abnormalDays: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["totalIncome", "totalExpense", "balance", "financialScore", "bestCategory", "worstCategory", "abnormalDays"]
            },
            comparison: { type: Type.STRING },
            behavioralInsight: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          },
          required: ["summary", "stats", "comparison", "behavioralInsight", "recommendation"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    reportCache.set(fingerprint, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error("Lỗi báo cáo FOS:", error);
    return null;
  }
};

/**
 * Phân tích đầu vào tự nhiên (NLP Entry)
 */
export const parseTransactionInput = async (input: string) => {
  const categories = Object.values(Category).join(", ");
  const systemInstruction = `NLP tài chính. Trích xuất sang JSON: amount (number), type (expense/income), category (phải thuộc [${categories}]), note.
  Quy tắc: 50k=50000, 1tr=1000000. Cẩn thận ánh xạ danh mục theo ngữ nghĩa.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: input,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["expense", "income"] },
            category: { type: Type.STRING },
            note: { type: Type.STRING }
          },
          required: ["amount", "type", "category", "note"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return null;
  }
};

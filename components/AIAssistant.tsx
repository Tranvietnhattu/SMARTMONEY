
import React, { useState, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { analyzeBehavioralFinances, queryFinancialDataStream } from '../services/geminiService';

interface AIAssistantProps {
  transactions: Transaction[];
}

interface CoachResponse {
  behavior_insight: string;
  run_out_date: string;
  projection_summary: string;
  causes: string[];
  preventive_actions: string[];
  future_scenarios: { case: string; result: string }[];
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ transactions }) => {
  const [analysis, setAnalysis] = useState<CoachResponse | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingQuery, setLoadingQuery] = useState(false);
  
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const archives = JSON.parse(localStorage.getItem('smart_money_archives') || '[]');

  const suggestions = [
    "Dự báo dòng tiền chu kỳ này?",
    "Xác định điểm giới hạn chi tiêu?",
    "Nguyên nhân thâm hụt ngân sách?",
    "Hành động ngăn chặn rủi ro?"
  ];

  const internalScrollToBottom = () => {
    if (chatScrollContainerRef.current && isAtBottomRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (chatScrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
      isAtBottomRef.current = scrollHeight - scrollTop <= clientHeight + 50;
    }
  };

  useEffect(() => {
    internalScrollToBottom();
  }, [chatHistory, loadingQuery]);

  const performAnalysis = async () => {
    if (transactions.length === 0) return;
    setLoadingAnalysis(true);
    const result = await analyzeBehavioralFinances(transactions);
    if (result) setAnalysis(result);
    setLoadingAnalysis(false);
  };

  const handleQuery = async (text: string = query) => {
    if (!text.trim() || loadingQuery) return;
    
    const userMsg: ChatMessage = { role: 'user', content: text };
    setChatHistory(prev => [...prev, userMsg]);
    setQuery('');
    setLoadingQuery(true);
    isAtBottomRef.current = true;

    try {
      setChatHistory(prev => [...prev, { role: 'ai', content: '' }]);
      
      const stream = await queryFinancialDataStream(text, transactions, archives);
      let accumulatedText = "";

      for await (const chunk of stream) {
        const textChunk = chunk.text;
        if (textChunk) {
          accumulatedText += textChunk;
          setChatHistory(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'ai', content: accumulatedText };
            return updated;
          });
        }
      }
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "SMART MONEY - NHATTU SJC FOS: Lỗi kết nối. Vui lòng thử lại." }]);
    } finally {
      setLoadingQuery(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Trạng thái vận hành FOS - Brighter Gradient */}
      <div className="w-full bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/10" style={{ backgroundImage: 'linear-gradient(135deg, #0f172a, var(--primary-color))' }}>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                <span className="text-2xl animate-pulse">🤖</span>
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">AI TÀI CHÍNH SMART MONEY - NHATTU SJC</h2>
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-indigo-300">Động cơ lõi v6.0 • Insight Real-time</p>
              </div>
            </div>
            
            <p className="text-sm text-indigo-100/80 font-medium leading-relaxed">
              Hệ thống đang sẵn sàng phân tích dữ liệu dòng tiền, dự báo rủi ro thâm hụt và đề xuất kế hoạch tối ưu.
            </p>
          </div>

          <button
            onClick={performAnalysis}
            disabled={loadingAnalysis || transactions.length === 0}
            className="w-full md:w-auto bg-primary text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-primary-glow"
          >
            {loadingAnalysis ? "Đang xử lý..." : "⚡ Kích hoạt Phân tích"}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="w-full space-y-6 animate-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             {/* Chỉ báo điểm rủi ro */}
             <div className={`p-6 rounded-[2.5rem] border shadow-sm flex items-center space-x-4 ${analysis.run_out_date === 'SAFE' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${analysis.run_out_date === 'SAFE' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                  {analysis.run_out_date === 'SAFE' ? '✔️' : '⚠️'}
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${analysis.run_out_date === 'SAFE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Dự báo rủi ro
                  </p>
                  <p className={`text-xl font-black italic ${analysis.run_out_date === 'SAFE' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {analysis.run_out_date === 'SAFE' ? 'DỰ BÁO AN TOÀN' : `Dự kiến: ${new Date(analysis.run_out_date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })}`}
                  </p>
                </div>
             </div>

             {/* Nhận định chiến lược */}
             <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-50 text-primary rounded-2xl flex items-center justify-center text-2xl">🧠</div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nhận định AI</p>
                  <p className="text-xs font-bold text-slate-800 leading-snug">
                    {analysis.behavior_insight}
                  </p>
                </div>
             </div>
          </div>

          {/* Chi tiết dự báo dòng tiền */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-0"></div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.3em] mb-4 flex items-center relative z-10">
              <span className="w-3 h-3 bg-primary rounded-full mr-3 animate-pulse shadow-primary-glow"></span>
              Báo cáo Dòng tiền ảo
            </h3>
            <div className="bg-slate-900/95 text-indigo-300 p-6 rounded-3xl font-mono text-[11px] leading-relaxed mb-8 border border-white/5 relative z-10 shadow-inner">
              <span className="text-white/40 font-bold">&gt; INITIALIZING_VIRTUAL_CASH_FLOW...</span><br/>
              {analysis.projection_summary}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              {/* Phân tích nguyên nhân */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                   <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-2">Gốc rễ rủi ro</p>
                </div>
                <div className="space-y-3">
                  {analysis.causes.map((cause, i) => (
                    <div key={i} className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100">
                      <p className="text-[11px] font-bold text-rose-900">{cause}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Phân tích hành động */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-2">Hành động khắc phục</p>
                </div>
                <div className="space-y-3">
                  {analysis.preventive_actions.map((action, i) => (
                    <div key={i} className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] font-bold text-emerald-900">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminal - Brighter Accents */}
      <div className="w-full bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col h-[550px] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-primary-glow"></div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Hệ điều hành Truy vấn FOS</span>
          </div>
          {chatHistory.length > 0 && (
            <button 
              onClick={() => setChatHistory([])}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest px-3 py-1 bg-white rounded-lg border border-slate-100"
            >Xóa bộ nhớ</button>
          )}
        </div>

        <div 
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar bg-gradient-to-b from-slate-50/50 to-white"
        >
          {chatHistory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 py-10">
              <div className="w-24 h-24 bg-white text-primary rounded-[2.5rem] flex items-center justify-center text-4xl shadow-md border border-slate-100 animate-bounce-subtle">🔎</div>
              <div className="w-full max-w-md space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Câu hỏi phổ biến</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleQuery(s)}
                      className="text-[11px] font-bold text-slate-600 bg-white hover:bg-primary hover:text-white hover:scale-105 p-4 rounded-2xl border border-slate-200 transition-all text-left shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none shadow-primary-glow' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
              }`}>
                {msg.role === 'ai' ? (
                  <div className="prose prose-sm prose-slate max-w-none">
                    {msg.content.split('\n').map((line, j) => (
                       <p key={j} className="mb-3 last:mb-0">
                         {line.split('**').map((part, k) => k % 2 === 1 ? <strong key={k} className="text-primary font-black">{part}</strong> : part)}
                       </p>
                    ))}
                    {msg.content === '' && (
                      <div className="flex space-x-1.5 py-2">
                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="font-bold">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0">
          <div className="relative group max-w-3xl mx-auto w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              placeholder="Nhập yêu cầu truy vấn tài chính..."
              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary rounded-[1.5rem] p-5 pr-20 text-sm font-bold outline-none transition-all shadow-inner focus:bg-white"
            />
            <button
              onClick={() => handleQuery()}
              disabled={loadingQuery || !query.trim()}
              className="absolute right-2 top-2 bottom-2 bg-primary text-white px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 disabled:opacity-50 transition-all flex items-center shadow-lg shadow-primary-glow"
            >
              Gửi lệnh
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center py-6">
        <div className="w-16 h-1 bg-gradient-to-r from-indigo-200 via-blue-200 to-indigo-200 rounded-full mb-4"></div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">
          CORE AI ENGINE POWERED BY GEMINI 3 FLASH
        </p>
      </div>
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AIAssistant;

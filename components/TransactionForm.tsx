
import React, { useState, useCallback } from 'react';
import { Transaction, TransactionType, Category, PaymentSource } from '../types';
import { parseTransactionInput } from '../services/geminiService';

interface TransactionFormProps {
  onSubmit: (t: Transaction) => void;
  onCancel: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, onCancel }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState(''); 
  const [displayAmount, setDisplayAmount] = useState('');
  const [category, setCategory] = useState<Category>(Category.FOOD);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState<PaymentSource>(PaymentSource.CASH);
  const [note, setNote] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [aiHighlight, setAiHighlight] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      setAmount(rawValue);
      setDisplayAmount(rawValue ? Number(rawValue).toLocaleString('vi-VN') : '');
    }
  };

  const processText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseTransactionInput(text);
      if (result) {
        const newType = result.type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;
        setType(newType);
        setAmount(result.amount.toString());
        setDisplayAmount(Number(result.amount).toLocaleString('vi-VN'));
        setNote(result.note);
        const validCategories = Object.values(Category);
        const matched = validCategories.find(c => c.toLowerCase().includes(result.category.toLowerCase()));
        if (matched) setCategory(matched as Category);
        setAiHighlight(true);
        setTimeout(() => setAiHighlight(false), 1500);
        setAiInput('');
      }
    } catch (e) { 
      console.error(e); 
      alert("AI không thể xử lý nội dung này. Vui lòng thử lại hoặc nhập tay.");
    } finally { 
      setIsParsing(false); 
    }
  }, []);

  const handleAIParse = () => {
    processText(aiInput);
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiInput(transcript);
      processText(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    onSubmit({
      id: Math.random().toString(36).substr(2, 9),
      type, amount: numericAmount, category, date: new Date(date).toISOString(), source, note
    });
  };

  const availableCats = type === TransactionType.EXPENSE 
    ? [Category.FOOD, Category.SHOPPING, Category.BILLS, Category.ENTERTAINMENT, Category.OTHER]
    : [Category.SALARY, Category.BONUS, Category.OTHER];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
      {/* AI Box */}
      <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em]">AI Fast Entry</span>
              {isListening && (
                <div className="flex gap-1 items-center">
                  <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping"></span>
                  <span className="text-[9px] font-bold text-rose-400 uppercase">Đang lắng nghe...</span>
                </div>
              )}
            </div>
            <span className={`w-2 h-2 rounded-full animate-pulse shadow-primary-glow ${isListening ? 'bg-rose-500' : 'bg-primary'}`}></span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAIParse()}
              placeholder={isListening ? "Hãy nói: 'Ăn sáng 30k'..." : "Ví dụ: Ăn tối phở bò 45k"}
              className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-2xl p-5 pr-28 text-sm text-white font-medium outline-none transition-all placeholder:text-slate-600"
            />
            <div className="absolute right-2 top-2 bottom-2 flex gap-1">
              <button
                onClick={toggleVoiceInput}
                className={`w-10 flex items-center justify-center rounded-xl transition-all ${isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-white/10 text-slate-400 hover:text-white hover:bg-white/20'}`}
                title="Nhập bằng giọng nói"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              </button>
              <button
                onClick={handleAIParse}
                disabled={isParsing || (!aiInput.trim() && !isListening)}
                className="bg-primary text-white px-5 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
              >
                {isParsing ? "..." : "XỬ LÝ"}
              </button>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 font-bold italic text-center">
            Bạn có thể nói hoặc gõ nội dung giao dịch để AI tự động phân loại.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <div className={`bg-white rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.05)] border-2 transition-all duration-700 ${aiHighlight ? 'border-primary ring-8 ring-primary/10' : 'border-slate-50'}`}>
        <div className="p-8 pb-0 flex flex-col items-center">
           <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full max-w-xs mb-8">
            <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${type === TransactionType.EXPENSE ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}>CHI TIÊU</button>
            <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${type === TransactionType.INCOME ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>THU NHẬP</button>
          </div>
          
          <div className="w-full text-center space-y-2 group">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Số tiền giao dịch</p>
            <div className="flex items-center justify-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={displayAmount}
                onChange={handleAmountChange}
                placeholder="0"
                className={`w-full max-w-md text-6xl font-black text-center outline-none bg-transparent tabular-nums placeholder:text-slate-100 transition-colors ${type === TransactionType.EXPENSE ? 'text-rose-600' : 'text-emerald-600'}`}
              />
              <span className="text-xl font-black text-slate-200">đ</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh mục</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black border-2 border-transparent focus:border-primary/20 outline-none appearance-none cursor-pointer">
                {availableCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phương thức</label>
              <select value={source} onChange={(e) => setSource(e.target.value as PaymentSource)} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black border-2 border-transparent focus:border-primary/20 outline-none appearance-none cursor-pointer">
                {Object.values(PaymentSource).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tháng</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-black border-2 border-transparent focus:border-primary/20 outline-none" />
            </div>
            <div className="sm:col-span-2 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú nhanh</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhập ghi chú..." className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary/20 outline-none" />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95">HỦY BỎ</button>
            <button type="submit" className="flex-[2] py-5 bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:opacity-95 transition-all active:scale-95" style={{ boxShadow: '0 10px 30px -5px var(--primary-glow)' }}>LƯU GIAO DỊCH</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;

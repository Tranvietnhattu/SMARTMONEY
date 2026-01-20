
import React, { useState, useEffect } from 'react';
import { Transaction, ArchivedCycle } from './types';
import BottomNav from './components/BottomNav';
import Overview from './components/Overview';
import CalendarView from './components/CalendarView';
import TransactionForm from './components/TransactionForm';
import AIAssistant from './components/AIAssistant';
import Settings from './components/Settings';
import { generateCycleReport } from './services/geminiService';

export const getCycleRange = (date: Date, closingDay: number) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();

  if (closingDay === 1) {
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999); 
    return { start, end, id: `CHU_KY-${year}-${String(month + 1).padStart(2, '0')}` };
  }

  let start: Date, end: Date, cycleLabel: string;
  
  if (d.getDate() >= closingDay) {
    start = new Date(year, month, closingDay, 0, 0, 0, 0);
    const nextCycleStart = new Date(year, month + 1, closingDay, 0, 0, 0, 0);
    end = new Date(nextCycleStart.getTime() - 1);
    cycleLabel = `${year}-${String(month + 1).padStart(2, '0')}`;
  } else {
    const prevCycleStart = new Date(year, month - 1, closingDay, 0, 0, 0, 0);
    start = prevCycleStart;
    const currentMonthStart = new Date(year, month, closingDay, 0, 0, 0, 0);
    end = new Date(currentMonthStart.getTime() - 1);
    cycleLabel = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  }
  
  return { start, end, id: `CHU_KY_TU_CHON-${cycleLabel}` };
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'add' | 'ai' | 'settings'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [closingDay, setClosingDay] = useState<number>(() => {
    return Number(localStorage.getItem('smart_money_closing_day')) || 1;
  });
  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    return localStorage.getItem('smart_money_theme_color') || '#0A3D62';
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--primary-glow', `${primaryColor}33`);
    localStorage.setItem('smart_money_theme_color', primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    const saved = localStorage.getItem('smart_money_transactions');
    const lastCycleId = localStorage.getItem('smart_money_last_cycle_id');
    const now = new Date();
    const currentCycle = getCycleRange(now, closingDay);

    let currentTransactions: Transaction[] = [];
    if (saved) {
      try { currentTransactions = JSON.parse(saved); } catch (e) { console.error("Lỗi phân tích giao dịch", e); }
    }

    const checkAndCloseCycle = async () => {
      if (lastCycleId && lastCycleId !== currentCycle.id && currentTransactions.length > 0) {
        setIsClosing(true);
        const archives: ArchivedCycle[] = JSON.parse(localStorage.getItem('smart_money_archives') || '[]');
        const lastArchive = archives[archives.length - 1];
        const prevSummary = lastArchive?.report?.summary;
        const report = await generateCycleReport(currentTransactions, prevSummary);

        archives.push({
          cycleId: lastCycleId,
          data: currentTransactions,
          closedAt: new Date().toISOString(),
          report: report || undefined
        });

        localStorage.setItem('smart_money_archives', JSON.stringify(archives));
        localStorage.setItem('smart_money_transactions', JSON.stringify([]));
        localStorage.setItem('smart_money_last_cycle_id', currentCycle.id);
        setTransactions([]);
        setIsClosing(false);
        alert(`🎉 SMART MONEY - NHATTU SJC\nHệ thống đã tự động chốt sổ và lưu trữ báo cáo AI mới nhất.`);
      } else {
        setTransactions(currentTransactions);
        if (!lastCycleId) localStorage.setItem('smart_money_last_cycle_id', currentCycle.id);
      }
    };

    checkAndCloseCycle();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [closingDay]);

  useEffect(() => {
    localStorage.setItem('smart_money_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('smart_money_closing_day', String(closingDay));
  }, [closingDay]);

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
    setActiveTab('overview');
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const clearAllData = () => {
    if (window.confirm(`⚠️ LÀM MỚI CHU KỲ HIỆN TẠI?\nDữ liệu giao dịch kỳ này sẽ bị xóa vĩnh viễn.`)) {
      setTransactions([]);
    }
  };

  const renderContent = () => {
    if (isClosing) return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-16 h-16 border-[6px] border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-sm font-black text-slate-800 uppercase tracking-widest">AI Đang Chốt Sổ</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">NHATTU SJC FINANCIAL OS • ENGINE v6.0</p>
        </div>
      </div>
    );

    switch (activeTab) {
      case 'overview': return <Overview transactions={transactions} onDelete={deleteTransaction} closingDay={closingDay} />;
      case 'calendar': return <CalendarView transactions={transactions} />;
      case 'add': return <TransactionForm onSubmit={addTransaction} onCancel={() => setActiveTab('overview')} />;
      case 'ai': return <AIAssistant transactions={transactions} />;
      case 'settings': return (
        <Settings 
          transactions={transactions} 
          onSetTransactions={setTransactions} 
          onClearAll={clearAllData} 
          closingDay={closingDay} 
          onSetClosingDay={setClosingDay}
          primaryColor={primaryColor}
          onSetPrimaryColor={setPrimaryColor}
        />
      );
      default: return <Overview transactions={transactions} onDelete={deleteTransaction} closingDay={closingDay} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col items-center selection:bg-indigo-100">
      {!isOnline && (
        <div className="w-full bg-rose-500 text-white text-[9px] py-1.5 text-center font-black uppercase tracking-[0.3em] sticky top-0 z-[60] shadow-md">
          Chế độ Offline • Dữ liệu cục bộ được bảo vệ
        </div>
      )}
      
      <header className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50 flex justify-center shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
        <div className="w-full max-w-5xl px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 transition-transform active:scale-95 duration-200 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden group" style={{ boxShadow: '0 10px 25px -5px var(--primary-glow)' }}>
              <span className="text-white font-black text-sm tracking-tighter relative z-10">NT</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[15px] font-black text-slate-900 uppercase tracking-tight leading-none">
                Smart Money
              </h1>
              <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">NHATTU SJC • FINANCIAL OS</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex flex-col items-end px-3 py-1 border-r border-slate-100">
               <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Status</span>
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Live Engine</span>
             </div>
            <div className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center cursor-pointer active:scale-90 transition-all hover:bg-white hover:shadow-md">
              <span className="text-sm">👤</span>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl flex-1 px-6 py-8 mb-32 overflow-x-hidden">
        <div key={activeTab} className="tab-transition">
          {renderContent()}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Visual Decor Blobs */}
      <div className="fixed top-20 left-10 w-64 h-64 bg-indigo-100/30 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-20 right-10 w-64 h-64 bg-rose-50/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>
    </div>
  );
};

export default App;

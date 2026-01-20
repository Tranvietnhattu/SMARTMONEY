
import React, { useMemo } from 'react';
import { Transaction, TransactionType, IS_ESSENTIAL } from '../types';

interface FinancialScoreCardProps {
  transactions: Transaction[];
}

const FinancialScoreCard: React.FC<FinancialScoreCardProps> = ({ transactions }) => {
  const financialResult = useMemo(() => {
    const now = new Date();
    const monthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    if (monthTransactions.length === 0) return { 
      score: 0, 
      label: 'CHƯA DỮ LIỆU', 
      color: 'slate', 
      emoji: '😶',
      suggestion: 'Hãy bắt đầu ghi chép để AI đánh giá sức khỏe tài chính của bạn.' 
    };

    let income = 0, totalExpense = 0, essentialExpense = 0;
    const dailyExpenses: Record<string, number> = {};

    monthTransactions.forEach(t => {
      if (t.type === TransactionType.INCOME) income += t.amount;
      else {
        totalExpense += t.amount;
        if (IS_ESSENTIAL[t.category]) essentialExpense += t.amount;
        const day = t.date.split('T')[0];
        dailyExpenses[day] = (dailyExpenses[day] || 0) + t.amount;
      }
    });

    const savings = income - totalExpense;
    const savingsRate = income > 0 ? (savings / income) : 0;
    const savingsScore = Math.min(40, Math.max(0, (savingsRate / 0.2) * 40));
    const essentialRate = income > 0 ? (essentialExpense / income) : (essentialExpense > 0 ? 1 : 0);
    const essentialScore = Math.min(30, Math.max(0, (1 - (essentialRate > 0.5 ? (essentialRate - 0.5) / 0.5 : 0)) * 30));
    const stabilityScore = Object.keys(dailyExpenses).length > 1 ? 20 : 10;

    const totalScore = Math.round(savingsScore + essentialScore + stabilityScore);

    let label = 'CẦN CẢI THIỆN', color = 'red', emoji = '😰', suggestion = 'Chi tiêu đang vượt quá tầm kiểm soát.';
    if (totalScore >= 85) { label = 'XUẤT SẮC'; color = 'purple'; emoji = '💎'; suggestion = 'Bạn đang quản lý tài chính ở cấp độ chuyên gia!'; }
    else if (totalScore >= 70) { label = 'RẤT TỐT'; color = 'emerald'; emoji = '✨'; suggestion = 'Tiếp tục duy trì tỷ lệ tiết kiệm này.'; }
    else if (totalScore >= 50) { label = 'ỔN ĐỊNH'; color = 'amber'; emoji = '⚖️'; suggestion = 'Hãy cân nhắc cắt giảm các khoản chi phí không tên.'; }

    return { score: totalScore, label, color, emoji, suggestion };
  }, [transactions]);

  const { score, label, color, emoji, suggestion } = financialResult;

  const colorClasses: Record<string, string> = {
    red: 'from-rose-500 to-red-600 text-rose-600 bg-rose-50/80 border-rose-200 shadow-rose-100',
    amber: 'from-orange-400 to-amber-500 text-amber-600 bg-amber-50/80 border-amber-200 shadow-amber-100',
    emerald: 'from-emerald-400 to-teal-500 text-emerald-600 bg-emerald-50/80 border-emerald-200 shadow-emerald-100',
    purple: 'from-indigo-500 to-violet-600 text-violet-600 bg-indigo-50/80 border-indigo-200 shadow-indigo-100',
    slate: 'from-slate-400 to-slate-500 text-slate-500 bg-slate-50/80 border-slate-200 shadow-slate-100'
  };

  const circleRadius = 32;
  const circumference = 2 * Math.PI * circleRadius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`rounded-[2.5rem] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border relative group transition-all duration-500 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${colorClasses[color].split(' bg-')[1].split(' ')[0]} ${colorClasses[color].split(' border-')[1].split(' ')[0]}`}>
      <div className="flex justify-between items-center relative z-10">
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-80">Financial Score</p>
          <div className="flex items-baseline gap-1">
            <h3 className={`text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br ${colorClasses[color].split(' text-')[0]}`}>
              {score}
            </h3>
            <span className="text-slate-400 font-bold text-lg">/100</span>
          </div>
          <div className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/80 border ${colorClasses[color].split(' border-')[1]} ${colorClasses[color].split(' text-')[1]}`}>
            {label}
          </div>
        </div>
        
        <div className="relative w-28 h-28 flex items-center justify-center">
            <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90 filter drop-shadow-md">
                <circle cx="50" cy="50" r={circleRadius} fill="transparent" stroke="white" strokeWidth="10" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r={circleRadius} 
                  fill="transparent" 
                  stroke="currentColor" 
                  strokeWidth="10" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={offset}
                  className={`${colorClasses[color].split(' text-')[1].split(' ')[0]} transition-all duration-1000 ease-out`}
                  strokeLinecap="round" 
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl filter drop-shadow-md group-hover:scale-125 transition-transform duration-300">
                {emoji}
              </span>
            </div>
        </div>
      </div>

      <div className="mt-7 pt-6 border-t border-white/40 flex items-center gap-4 group-hover:translate-x-1 transition-transform">
        <div className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center text-lg flex-shrink-0 shadow-sm transition-all border border-white">
          💡
        </div>
        <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
          "{suggestion}"
        </p>
      </div>
      
      {/* Background Decor */}
      <div className={`absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-30 bg-gradient-to-br ${colorClasses[color].split(' text-')[0]}`}></div>
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default FinancialScoreCard;

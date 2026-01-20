
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { COLORS, CATEGORY_ICONS } from '../constants';
import FinancialScoreCard from './FinancialScoreCard';
import { getCycleRange } from '../App';

interface OverviewProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  closingDay: number;
}

const Overview: React.FC<OverviewProps> = ({ transactions, onDelete, closingDay }) => {
  const now = new Date();
  const cycle = useMemo(() => getCycleRange(now, closingDay), [now, closingDay]);
  const [chartType, setChartType] = useState<TransactionType>(TransactionType.EXPENSE);

  const currentCycleData = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= cycle.start && d <= cycle.end;
    });
  }, [transactions, cycle]);

  const stats = useMemo(() => {
    const income = currentCycleData
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = currentCycleData
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expense, balance: income - expense };
  }, [currentCycleData]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    currentCycleData
      .filter(t => t.type === chartType)
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentCycleData, chartType]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black pointer-events-none drop-shadow-md">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const totalForChart = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Trung tâm Tài chính</h2>
          <div className="flex items-center gap-3 mt-2">
            <div className="px-3 py-1 bg-white border border-indigo-100 rounded-full flex items-center gap-2 shadow-sm">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                CHU KỲ ĐANG MỞ
              </p>
            </div>
            <p className="text-[11px] font-bold text-slate-400">
              {cycle.start.toLocaleDateString('vi-VN')} – {cycle.end.toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 text-center">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Số dư thực</p>
             <p className="text-sm font-black text-slate-800">{formatCurrency(stats.balance)}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Bento Cards */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FinancialScoreCard transactions={transactions} />
            
            <div className="bg-primary p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all duration-500" style={{ backgroundImage: 'linear-gradient(135deg, var(--primary-color), #4f46e5)' }}>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em] mb-3">TỔNG SỐ DƯ KỲ</p>
                <h4 className="text-4xl sm:text-5xl font-black tracking-tighter mb-8 tabular-nums filter drop-shadow-lg">
                  {formatCurrency(stats.balance)}
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mt-auto pt-6 border-t border-white/20">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Tiết kiệm</p>
                    <p className="text-lg font-black text-emerald-300 drop-shadow-sm">{stats.income > 0 ? Math.round((stats.balance/stats.income)*100) : 0}%</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Đã chi</p>
                    <p className="text-lg font-black text-rose-300 drop-shadow-sm">{formatCurrency(stats.expense)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => setChartType(TransactionType.INCOME)}
              className={`p-6 rounded-[2rem] border transition-all relative overflow-hidden group active:scale-95 ${chartType === TransactionType.INCOME ? 'bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-100' : 'bg-white border-slate-100'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${chartType === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>↓</div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${chartType === TransactionType.INCOME ? 'text-emerald-700' : 'text-slate-400'}`}>Thu nhập</p>
              </div>
              <p className={`text-2xl font-black tabular-nums ${chartType === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>{formatCurrency(stats.income)}</p>
            </button>
            <button 
              onClick={() => setChartType(TransactionType.EXPENSE)}
              className={`p-6 rounded-[2rem] border transition-all relative overflow-hidden group active:scale-95 ${chartType === TransactionType.EXPENSE ? 'bg-rose-50 border-rose-300 shadow-lg shadow-rose-100' : 'bg-white border-slate-100'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${chartType === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>↑</div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${chartType === TransactionType.EXPENSE ? 'text-rose-700' : 'text-slate-400'}`}>Chi tiêu</p>
              </div>
              <p className={`text-2xl font-black tabular-nums ${chartType === TransactionType.EXPENSE ? 'text-rose-600' : 'text-slate-800'}`}>{formatCurrency(stats.expense)}</p>
            </button>
          </div>
        </div>

        {/* Right Column: Chart Widget - Brighter & More Vibrant Background */}
        <div className="lg:col-span-4 bg-gradient-to-br from-white via-indigo-50/20 to-blue-50/30 p-8 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col min-h-[500px] hover:shadow-xl hover:border-indigo-100 transition-all duration-500 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-200/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 space-y-6 mb-8">
            <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] text-center">Phân bổ Dòng tiền</h3>
            <div className="flex p-1.5 bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-inner">
              <button 
                onClick={() => setChartType(TransactionType.EXPENSE)}
                className={`flex-1 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all ${chartType === TransactionType.EXPENSE ? 'bg-primary text-white shadow-lg shadow-primary-glow' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Chi tiêu
              </button>
              <button 
                onClick={() => setChartType(TransactionType.INCOME)}
                className={`flex-1 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all ${chartType === TransactionType.INCOME ? 'bg-primary text-white shadow-lg shadow-primary-glow' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Thu nhập
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col relative z-10">
            {chartData.length > 0 ? (
              <>
                <div className="h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={chartType === TransactionType.INCOME ? COLORS.chart[(index + 1) % COLORS.chart.length] : COLORS.chart[index % COLORS.chart.length]} 
                            className="drop-shadow-sm cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '900', padding: '16px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TỔNG</p>
                     <p className="text-lg font-black text-slate-800 tracking-tighter">{formatCurrency(totalForChart).split(' ')[0]}K</p>
                  </div>
                </div>
                <div className="mt-8 space-y-3 overflow-y-auto max-h-[220px] hide-scrollbar pr-1">
                  {chartData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/40 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 group">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm group-hover:scale-125 transition-transform" style={{ backgroundColor: chartType === TransactionType.INCOME ? COLORS.chart[(i + 1) % COLORS.chart.length] : COLORS.chart[i % COLORS.chart.length] }}></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 tabular-nums">{formatCurrency(item.value)}</p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${chartType === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {Math.round((item.value / totalForChart) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-3xl mb-4 grayscale opacity-40 shadow-sm border border-slate-50">📊</div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Dữ liệu đang trống</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.25em] flex items-center gap-3">
            <span className="w-8 h-[2px] bg-primary rounded-full"></span>
            Hoạt động gần đây
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentCycleData.length > 0 ? (
            currentCycleData.slice(0, 10).map(t => (
              <div key={t.id} className="bg-white p-5 rounded-3xl flex items-center justify-between shadow-sm border border-slate-50 hover:border-primary/20 hover:shadow-lg transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-5">
                  <div className="transform transition-transform group-hover:scale-110 duration-500">
                    {CATEGORY_ICONS[t.category] || <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center text-xl">💰</div>}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 tracking-tight">{t.category}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                      {new Date(t.date).toLocaleDateString('vi-VN')} • <span className="italic">{t.note || t.source}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <p className={`text-sm font-black tabular-nums ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <button onClick={() => onDelete(t.id)} className="p-2.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">✕</button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-100 text-center">
              <div className="text-4xl mb-4 opacity-20">🍃</div>
              <p className="text-slate-300 text-[11px] font-black uppercase tracking-widest">Chưa có giao dịch phát sinh trong kỳ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;

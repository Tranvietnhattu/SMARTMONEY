
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';

interface CalendarViewProps {
  transactions: Transaction[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ transactions }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(new Date().toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday

  const dailyData = useMemo(() => {
    const data: Record<string, { income: number; expense: number; transactions: Transaction[] }> = {};
    transactions.forEach(t => {
      const dateKey = t.date.split('T')[0];
      if (!data[dateKey]) data[dateKey] = { income: 0, expense: 0, transactions: [] };
      if (t.type === TransactionType.INCOME) data[dateKey].income += t.amount;
      else data[dateKey].expense += t.amount;
      data[dateKey].transactions.push(t);
    });
    return data;
  }, [transactions]);

  const avgExpense = useMemo(() => {
    // FIX: Cast Object.values to the expected record value type to prevent 'unknown' property access errors
    const dataValues = Object.values(dailyData) as Array<{ income: number; expense: number; transactions: Transaction[] }>;
    const expenses = dataValues.map(d => d.expense).filter(e => e > 0);
    if (expenses.length === 0) return 0;
    return expenses.reduce((a, b) => a + b, 0) / expenses.length;
  }, [dailyData]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatCurrencyCompact = (val: number) => {
    if (val === 0) return '';
    // Use en-US for comma separator
    return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val);
  };

  const formatCurrencyFull = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val) + 'đ';
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`pad-${i}`} className="h-24 sm:h-32 border-b border-r border-slate-50 bg-slate-50/20" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateKey = dateObj.toISOString().split('T')[0];
      const data = dailyData[dateKey];
      const isSelected = selectedDay === dateKey;
      const isAnomalous = data && data.expense > avgExpense * 1.5;

      cells.push(
        <div
          key={day}
          onClick={() => setSelectedDay(dateKey)}
          className={`h-24 sm:h-32 border-b border-r border-slate-50 relative p-2 cursor-pointer transition-all duration-200 group hover:z-10 hover:shadow-lg ${
            isSelected ? 'bg-indigo-50/30 ring-2 ring-inset ring-indigo-500/20' : 'bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-black ${isAnomalous ? 'text-orange-500' : 'text-slate-400'} group-hover:text-slate-800 transition-colors`}>
              {day.toString().padStart(2, '0')}
            </span>
            {isAnomalous && <span className="text-[10px] animate-pulse" title="Chi tiêu bất thường">⚠️</span>}
          </div>
          {data && (
            <div className="mt-2 space-y-0.5 flex flex-col items-center">
              {data.income > 0 && (
                <span className="text-[10px] font-black text-emerald-600 truncate w-full text-center">+{formatCurrencyCompact(data.income)}</span>
              )}
              {data.expense > 0 && (
                <span className="text-[10px] font-black text-red-500 truncate w-full text-center">-{formatCurrencyCompact(data.expense)}</span>
              )}
            </div>
          )}
          {isSelected && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full"></div>}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800">Lịch sử chi tiêu</h2>
        <div className="flex items-center space-x-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">❮</button>
          <div className="px-4 text-sm font-black text-indigo-600 uppercase tracking-tighter">
            Tháng {month + 1}, {year}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">❯</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100 text-center py-4">
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                <span key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 border-l border-t border-slate-50">
              {renderCells()}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Chi tiết ngày</h3>
              <p className="text-lg font-black text-slate-800">
                {selectedDay ? new Date(selectedDay).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }) : '---'}
              </p>
            </div>

            <div className="flex-1 space-y-4">
              {selectedDay && dailyData[selectedDay] ? (
                dailyData[selectedDay].transactions.map(t => (
                  <div key={t.id} className="group p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-800">{t.category}</span>
                      <span className={`text-sm font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-500'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrencyFull(t.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-medium">{t.source}</span>
                      {t.note && <span className="text-slate-400 italic">"{t.note}"</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-slate-300">
                  <span className="text-3xl mb-2">🏖️</span>
                  <p className="text-xs font-bold uppercase">Thảnh thơi</p>
                </div>
              )}
            </div>

            {selectedDay && dailyData[selectedDay] && (
              <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Thu</p>
                  <p className="text-sm font-black text-emerald-600">+{formatCurrencyFull(dailyData[selectedDay].income || 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Chi</p>
                  <p className="text-sm font-black text-red-500">-{formatCurrencyFull(dailyData[selectedDay].expense || 0)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
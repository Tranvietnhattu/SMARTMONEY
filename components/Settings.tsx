
import React, { useMemo, useState } from 'react';
import { Transaction, ArchivedCycle, Category } from '../types';
import { getCycleRange } from '../App';

interface SettingsProps {
  transactions: Transaction[];
  onSetTransactions: (t: Transaction[]) => void;
  onClearAll: () => void;
  closingDay: number;
  onSetClosingDay: (day: number) => void;
  primaryColor: string;
  onSetPrimaryColor: (color: string) => void;
}

interface DataError {
  type: 'DUPLICATE' | 'MISSING_CAT' | 'INVALID_DATE' | 'FUTURE_DATE';
  message: string;
  transactionId?: string;
}

const THEME_PALETTE = [
  { name: 'Navy', color: '#0A3D62' },
  { name: 'Emerald', color: '#065F46' },
  { name: 'Indigo', color: '#4338CA' },
  { name: 'Rose', color: '#BE123C' },
  { name: 'Amber', color: '#B45309' },
  { name: 'Slate', color: '#334155' }
];

const Settings: React.FC<SettingsProps> = ({ 
  transactions, 
  onSetTransactions, 
  onClearAll, 
  closingDay, 
  onSetClosingDay,
  primaryColor,
  onSetPrimaryColor
}) => {
  const [selectedArchive, setSelectedArchive] = useState<ArchivedCycle | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<DataError[] | null>(null);

  const archives: ArchivedCycle[] = useMemo(() => {
    return JSON.parse(localStorage.getItem('smart_money_archives') || '[]');
  }, []);

  const runDiagnostic = () => {
    setIsScanning(true);
    setScanResults(null);
    
    setTimeout(() => {
      const errors: DataError[] = [];
      const seen = new Set<string>();
      const now = new Date();

      transactions.forEach((t) => {
        const fingerprint = `${t.type}-${t.amount}-${t.category}-${t.date}-${t.note}`;
        if (seen.has(fingerprint)) {
          errors.push({
            type: 'DUPLICATE',
            message: `Phát hiện giao dịch lặp: ${t.category} (${new Intl.NumberFormat('vi-VN').format(t.amount)}đ)`,
            transactionId: t.id
          });
        }
        seen.add(fingerprint);

        if (!t.category || !Object.values(Category).includes(t.category as any)) {
          errors.push({
            type: 'MISSING_CAT',
            message: `Giao dịch ID ..${t.id.slice(-4)} thiếu danh mục hợp lệ.`,
            transactionId: t.id
          });
        }

        const tDate = new Date(t.date);
        if (isNaN(tDate.getTime())) {
          errors.push({
            type: 'INVALID_DATE',
            message: `Định dạng ngày không hợp lệ tại giao dịch ${t.category}.`,
            transactionId: t.id
          });
        } else if (tDate > now) {
          errors.push({
            type: 'FUTURE_DATE',
            message: `Giao dịch "${t.category}" được ghi nhận trong tương lai (${tDate.toLocaleDateString('vi-VN')}).`,
            transactionId: t.id
          });
        }
      });

      setScanResults(errors);
      setIsScanning(false);
    }, 800);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `smart_money_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          onSetTransactions(json);
          alert("Import thành công!");
        } else {
          alert("Dữ liệu không đúng định dạng!");
        }
      } catch (err) {
        alert("Có lỗi khi đọc file!");
      }
    };
    fileReader.readAsText(files[0]);
  };

  const cycleInfo = useMemo(() => {
    const now = new Date();
    const current = getCycleRange(now, closingDay);
    const nextClosingDate = new Date(current.end.getTime() + 1);

    return {
      currentStart: current.start.toLocaleDateString('vi-VN'),
      currentEnd: current.end.toLocaleDateString('vi-VN'),
      nextClosing: nextClosingDate.toLocaleDateString('vi-VN'),
    };
  }, [closingDay]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase">Tiện ích hệ thống</h2>
          <p className="text-sm text-slate-500 font-medium">Quản lý và cấu hình vận hành tự động</p>
        </div>
      </div>

      {/* Tùy chỉnh màu chủ đạo */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">MÀU SẮC GIAO DIỆN</h3>
        <div className="flex flex-wrap gap-4">
          {THEME_PALETTE.map((theme) => (
            <button
              key={theme.color}
              onClick={() => onSetPrimaryColor(theme.color)}
              className={`group flex flex-col items-center gap-2 transition-all ${primaryColor === theme.color ? 'scale-110' : 'hover:scale-105'}`}
            >
              <div 
                className={`w-12 h-12 rounded-2xl border-4 transition-all ${primaryColor === theme.color ? 'border-indigo-100 shadow-lg' : 'border-transparent'}`}
                style={{ backgroundColor: theme.color }}
              ></div>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${primaryColor === theme.color ? 'text-indigo-600' : 'text-slate-400'}`}>
                {theme.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tình trạng dữ liệu (Data Health Check) */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">CHẨN ĐOÁN HỆ THỐNG</h3>
          <button 
            onClick={runDiagnostic}
            disabled={isScanning || transactions.length === 0}
            className="text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-80 disabled:opacity-30 flex items-center"
          >
            {isScanning ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Đang quét...
              </>
            ) : "🚀 Chạy Chẩn đoán"}
          </button>
        </div>

        {scanResults && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            {scanResults.length === 0 ? (
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center space-x-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl">✓</div>
                <div>
                  <p className="text-xs font-black text-emerald-800 uppercase">Dữ liệu sạch</p>
                  <p className="text-[10px] font-bold text-emerald-600/70">Không phát hiện lỗi trùng lặp, thiếu mục hoặc sai ngày.</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 overflow-hidden">
                <div className="p-4 border-b border-amber-100 bg-amber-100/50 flex justify-between items-center">
                   <p className="text-[10px] font-black text-amber-800 uppercase">Phát hiện {scanResults.length} vấn đề cần lưu ý</p>
                   <button onClick={() => setScanResults(null)} className="text-amber-800 text-xs">✕</button>
                </div>
                <div className="max-h-60 overflow-y-auto p-4 space-y-3">
                  {scanResults.map((err, i) => (
                    <div key={i} className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-amber-200/50">
                      <span className="text-lg leading-none">
                        {err.type === 'DUPLICATE' ? '👯' : err.type === 'FUTURE_DATE' ? '⏳' : '❓'}
                      </span>
                      <p className="text-[11px] font-bold text-slate-700 leading-tight">
                        {err.message}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-amber-100/30 text-center">
                  <p className="text-[9px] font-bold text-amber-700 italic">Vui lòng quay lại tab Tổng quan để kiểm tra và chỉnh sửa thủ công.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auto-Closing Config */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
        <div>
          <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em] mb-4">TỰ ĐỘNG CHỐT SỔ</h3>
          <div className="flex items-center space-x-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
            <div className="w-5 h-5 bg-emerald-500 rounded-md flex items-center justify-center text-white text-[10px] font-black shadow-sm shadow-emerald-200">
              ✓
            </div>
            <div>
              <p className="text-xs font-black text-emerald-700 uppercase tracking-tighter">Kích hoạt</p>
              <p className="text-[10px] font-bold text-slate-400">Tự động chốt dữ liệu khi kết thúc chu kỳ</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Ngày chốt sổ (1–28)</span>
            <div className="flex items-center space-x-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button 
                onClick={() => onSetClosingDay(Math.max(1, closingDay - 1))}
                className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-800 font-black hover:bg-slate-50 active:scale-90 transition-all border border-slate-100"
              >–</button>
              <span className="text-lg font-black text-primary w-8 text-center tabular-nums">{String(closingDay).padStart(2, '0')}</span>
              <button 
                onClick={() => onSetClosingDay(Math.min(28, closingDay + 1))}
                className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-800 font-black hover:bg-slate-50 active:scale-90 transition-all border border-slate-100"
              >+</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chu kỳ hiện tại</p>
            <p className="text-sm font-black text-slate-800 tabular-nums">{cycleInfo.currentStart} – {cycleInfo.currentEnd}</p>
          </div>
          <div className="space-y-1 sm:text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chốt sổ tiếp theo</p>
            <p className="text-sm font-black text-primary tabular-nums">00:00 ngày {cycleInfo.nextClosing}</p>
          </div>
        </div>
      </div>

      {/* Cycle Archives / Reports */}
      {archives.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
          <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">LỊCH SỬ CHỐT SỔ & BÁO CÁO</h3>
          <div className="space-y-3">
            {archives.map((arc, idx) => (
              <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 transition-all">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{arc.cycleId}</p>
                    <p className="text-[9px] font-bold text-slate-400">Chốt lúc: {new Date(arc.closedAt).toLocaleString('vi-VN')}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedArchive(selectedArchive?.cycleId === arc.cycleId ? null : arc)}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    {selectedArchive?.cycleId === arc.cycleId ? 'Đóng báo cáo' : 'Xem báo cáo AI'}
                  </button>
                </div>
                
                {selectedArchive?.cycleId === arc.cycleId && arc.report && (
                  <div className="mt-6 pt-6 border-t border-slate-200 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Thu nhập</p>
                          <p className="text-xs font-black text-emerald-600">{formatCurrency(arc.report.stats.totalIncome)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Chi tiêu</p>
                          <p className="text-xs font-black text-red-500">{formatCurrency(arc.report.stats.totalExpense)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Số dư</p>
                          <p className="text-xs font-black text-primary">{formatCurrency(arc.report.stats.balance)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Điểm số</p>
                          <p className="text-xs font-black text-purple-600">{arc.report.stats.financialScore}/100</p>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2">Tóm tắt chu kỳ</p>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{arc.report.summary}"</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Phân tích hành vi</p>
                          <p className="text-[11px] font-bold text-slate-600 leading-snug">{arc.report.behavioralInsight}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Chiến lược đề xuất</p>
                          <p className="text-[11px] font-bold text-primary leading-snug">{arc.report.recommendation}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                         <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase">Tốt nhất: {arc.report.stats.bestCategory}</span>
                         <span className="text-[9px] font-black bg-red-100 text-red-700 px-3 py-1 rounded-full uppercase">Cần lưu ý: {arc.report.stats.worstCategory}</span>
                         {arc.report.stats.abnormalDays.length > 0 && (
                           <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-3 py-1 rounded-full uppercase">Ngày biến động: {arc.report.stats.abnormalDays.join(', ')}</span>
                         )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Management */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
        <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-primary transition-transform group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <p className="font-bold text-slate-800">Xuất dữ liệu</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Backup tệp tin JSON</p>
            </div>
          </div>
          <button onClick={exportData} className="bg-primary text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all active:scale-95" style={{ boxShadow: '0 8px 20px -5px var(--primary-glow)' }}>
            Export
          </button>
        </div>

        <div className="p-6 flex items-center justify-between hover:bg-emerald-50/50 transition-colors group">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div>
              <p className="font-bold text-slate-800">Nhập dữ liệu</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Khôi phục từ tệp tin</p>
            </div>
          </div>
          <label className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 cursor-pointer hover:bg-emerald-700 transition-all active:scale-95">
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>

        <div className="p-8 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <div>
              <p className="font-bold text-red-600">Làm mới chu kỳ hiện tại</p>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">Reset dữ liệu chu kỳ đang mở</p>
            </div>
          </div>
          <button 
            onClick={onClearAll} 
            className="w-full bg-red-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
          >
            Làm mới chu kỳ hiện tại
          </button>
        </div>
      </div>

      <div className="text-center pt-8 pb-12">
        <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2">SMART MONEY - NHATTU SJC Financial Operating System</p>
        <div className="w-12 h-1 bg-primary mx-auto rounded-full mb-4"></div>
        <p className="text-[11px] font-bold text-black">© 2026 SMART MONEY – NHATTU SJC. Bảo lưu mọi quyền.</p>
      </div>
    </div>
  );
};

export default Settings;

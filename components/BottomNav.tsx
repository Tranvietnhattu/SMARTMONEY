
import React from 'react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { 
      id: 'overview', 
      label: 'Tổng quan',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
      )
    },
    { 
      id: 'calendar', 
      label: 'Lịch',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      )
    },
    { 
      id: 'add', 
      label: 'Ghi chép', 
      center: true,
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      )
    },
    { 
      id: 'ai', 
      label: 'Trợ lý AI',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 8v4"/><path d="M12 16h.01"/><path d="M7 12h.01"/><path d="M17 12h.01"/></svg>
      )
    },
    { 
      id: 'settings', 
      label: 'Tiện ích',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
      )
    },
  ];

  return (
    <nav className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2rem] flex justify-around items-center p-2 z-40">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center transition-all duration-300 relative ${
              tab.center 
                ? 'bg-primary text-white w-14 h-14 rounded-2xl -mt-10 shadow-xl hover:scale-110 active:scale-95 shadow-primary-glow' 
                : 'w-16 h-12 rounded-xl'
            } ${isActive && !tab.center ? 'text-primary' : 'text-slate-400'}`}
            style={tab.center ? { boxShadow: '0 10px 25px -5px var(--primary-glow)' } : {}}
          >
            {isActive && !tab.center && (
              <span className="absolute -top-1 w-1 h-1 bg-primary rounded-full"></span>
            )}
            <span className={`${tab.center ? 'mb-0' : 'mb-0.5'}`}>
              {tab.icon(isActive)}
            </span>
            {!tab.center && <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;

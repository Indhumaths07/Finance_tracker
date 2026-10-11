import React from 'react';
import { 
  ShieldCheck, UserPlus, Settings, LogOut, Laptop, Smartphone 
} from 'lucide-react';
import { Customer } from '../types';

interface HeaderProps {
  customers: Customer[];
  viewMode: 'laptop' | 'phone';
  currentUserEmail?: string | null;
  isCloudSynced?: boolean;
  onToggleViewMode: (mode: 'laptop' | 'phone') => void;
  onOpenAddCustomer: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  currentUserEmail,
  isCloudSynced,
  onToggleViewMode,
  onOpenAddCustomer,
  onOpenSettings,
  onLogout,
}) => {
  return (
    <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-30 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs shrink-0 font-bold">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 truncate">
                Palaniyandavar Finance
              </h1>
              {isCloudSynced && (
                <span 
                  title={`Live Cloud Database Sync Active (${currentUserEmail || 'Logged in'})`}
                  className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>Cloud Synced</span>
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold truncate max-w-[200px] sm:max-w-none">
              {currentUserEmail ? `${currentUserEmail} (Mobile & PC Synced)` : 'Loan Tracker & Ledger'}
            </p>
          </div>
        </div>

        {/* Action Controls & View Mode Option */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* PHONE & LAPTOP VIEW SWITCHER */}
          <div 
            id="view-mode-selector"
            className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200"
            title="Switch View"
          >
            <button
              id="btn-view-phone"
              type="button"
              onClick={() => onToggleViewMode('phone')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'phone'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-[11px]">Phone</span>
            </button>

            <button
              id="btn-view-laptop"
              type="button"
              onClick={() => onToggleViewMode('laptop')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'laptop'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span className="text-[11px]">Laptop</span>
            </button>
          </div>

          {/* Add Customer Button */}
          <button
            id="btn-header-add-customer"
            onClick={onOpenAddCustomer}
            className="px-3 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Settings Button */}
          <button
            id="btn-header-settings"
            onClick={onOpenSettings}
            title="Settings & Financial Summary"
            className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-2xl transition-all cursor-pointer flex items-center justify-center"
          >
            <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Logout Button */}
          <button
            id="header-logout-btn"
            onClick={onLogout}
            title="Logout"
            className="p-2 sm:p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-2xl transition-all cursor-pointer flex items-center justify-center"
          >
            <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

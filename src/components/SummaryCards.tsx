import React from 'react';
import { TrendingUp, AlertCircle, Wallet, Users, CalendarClock, Coins } from 'lucide-react';
import { DashboardSummary } from '../types';
import { formatINR } from '../utils/financeCalculations';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* This Week's Collection (Replaced Profit) */}
      <div 
        id="summary-card-week-collection"
        className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            This Week Collection
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-300 tracking-tight">
            {formatINR(summary.thisWeekTotalCollected || 0)}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1 font-medium">
            <Coins className="w-3 h-3 inline" /> Total Collected: {formatINR(summary.totalCollectedOverall || 0)}
          </p>
        </div>
      </div>

      {/* Total Due Amount (Pending Principal + Accrued) */}
      <div 
        id="summary-card-due"
        className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Total Outstanding Due
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-300 tracking-tight">
            {formatINR(summary.totalDueAmount)}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1 font-medium">
            Pending Principal: {formatINR(summary.totalPrincipalRemaining)}
          </p>
        </div>
      </div>

      {/* Total Lent Amount (Principal Given Out) */}
      <div 
        id="summary-card-lent"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Capital Lent
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {formatINR(summary.totalPrincipalLent)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Total Principal Invested
          </p>
        </div>
      </div>

      {/* Customers & Breakdown */}
      <div 
        id="summary-card-customers"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Active Borrowers
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {summary.activeCustomers}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Active / {summary.totalCustomers} Total
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/30">
              <CalendarClock className="w-2.5 h-2.5" /> Weekly: {summary.weeklyCount}
            </span>
            <span className="inline-flex items-center gap-1 text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded-full border border-sky-800/30">
              Monthly: {summary.monthlyCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

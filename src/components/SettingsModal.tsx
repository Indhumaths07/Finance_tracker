import React, { useRef, useMemo, useState } from 'react';
import { 
  X, Settings, TrendingUp, Download, Upload, Trash2, LogOut, Calendar, 
  CheckCircle2, Filter, Search, Share2, ArrowRight, FileSpreadsheet,
  Wallet, Coins, ArrowUpRight, DollarSign, PiggyBank, Users,
  Cloud, RefreshCw, AlertCircle, ExternalLink, Sparkles
} from 'lucide-react';
import { Customer, DashboardSummary } from '../types';
import { 
  formatINR, getFilteredWeeklyCollections, generateWhatsAppReceipt 
} from '../utils/financeCalculations';
import { 
  exportBackupJSON, exportBackupCSV, importBackupJSON, getLastSavedTime
} from '../utils/storage';

interface SettingsModalProps {
  customers: Customer[];
  summary: DashboardSummary;
  currentUserEmail?: string | null;
  isCloudSynced?: boolean;
  onForceSyncCloud?: () => void;
  onClose: () => void;
  onDataRestored: (customers: Customer[]) => void;
  onClearAllData: () => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  customers,
  summary,
  currentUserEmail,
  isCloudSynced,
  onForceSyncCloud,
  onClose,
  onDataRestored,
  onClearAllData,
  onLogout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Weekly collection filter state: this_week | last_week | last_4_weeks | custom
  const [weeklyFilter, setWeeklyFilter] = useState<'this_week' | 'last_week' | 'last_4_weeks' | 'custom'>('this_week');
  const todayStr = new Date().toISOString().split('T')[0];
  const lastWeekStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const [customStartDate, setCustomStartDate] = useState(lastWeekStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);
  const [filterSearch, setFilterSearch] = useState('');
  const lastSavedInApp = getLastSavedTime();

  // Compute filtered collections
  const filterResults = useMemo(() => {
    return getFilteredWeeklyCollections(customers, weeklyFilter, customStartDate, customEndDate);
  }, [customers, weeklyFilter, customStartDate, customEndDate]);

  // Search filter for entries
  const displayEntries = useMemo(() => {
    if (!filterSearch.trim()) return filterResults.entries;
    const q = filterSearch.toLowerCase().trim();
    return filterResults.entries.filter(
      (e) => e.customerName.toLowerCase().includes(q) || e.village.toLowerCase().includes(q) || e.date.includes(q)
    );
  }, [filterResults.entries, filterSearch]);

  const handleExportJSON = () => {
    exportBackupJSON(customers);
  };

  const handleExportCSV = () => {
    exportBackupCSV(customers);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importBackupJSON(
        file,
        (importedData) => {
          onDataRestored(importedData);
          alert('Data restored successfully!');
        },
        (err) => alert(err)
      );
    }
    if (e.target) e.target.value = '';
  };

  const handleConfirmClear = () => {
    if (confirm('Are you sure you want to delete ALL customer data? This will give you a completely fresh empty app.')) {
      onClearAllData();
      alert('All customer data has been cleared.');
      onClose();
    }
  };

  const handleShareReceipt = (entry: typeof filterResults.entries[0]) => {
    const c = customers.find((cust) => cust.id === entry.customerId);
    if (!c) return;
    const tx = c.transactions.find((t) => t.id === entry.txId);
    if (!tx) return;
    const text = generateWhatsAppReceipt(c, tx);
    window.open(`https://wa.me/91${c.phone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="settings-modal-card"
        className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Finance Totals, Profit Reports & Settings
              </h2>
            </div>
          </div>

          <button
            id="btn-close-settings"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-800 bg-white">
          {/* SECTION 1: OVERALL BUSINESS TOTALS, LENT AMOUNT & PROFIT REPORT */}
          <div className="bg-gradient-to-br from-slate-50 via-indigo-50/20 to-emerald-50/20 border-2 border-indigo-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Business Totals & Profit Report
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-900 border border-indigo-200 text-xs font-bold">
                  <Users className="w-3.5 h-3.5 text-indigo-700" />
                  <span>{summary.totalCustomers} Customers ({summary.activeCustomers} Active)</span>
                </span>
              </div>
            </div>

            {/* 3 CORE HERO METRICS: LENT AMOUNT, TOTAL WITH INTEREST, EXPECTED PROFIT */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. AMOUNT GIVEN TO CUSTOMERS */}
              <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-700 block uppercase tracking-wider">
                      Principal Given
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
                    {formatINR(summary.totalPrincipalLent)}
                  </span>
                </div>
              </div>

              {/* 2. TOTAL AMOUNT WITH INTEREST */}
              <div className="bg-white border-2 border-sky-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-sky-800 block uppercase tracking-wider">
                      Total with Interest
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-sky-900 tracking-tight block">
                    {formatINR(summary.totalTargetWithInterest)}
                  </span>
                </div>
              </div>

              {/* 3. TOTAL EXPECTED PROFIT */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border-2 border-emerald-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 block uppercase tracking-wider">
                      Total Expected Profit
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight block">
                      +{formatINR(summary.totalExpectedProfit)}
                    </span>
                    {summary.totalPrincipalLent > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 text-[10px] font-bold">
                        +{((summary.totalExpectedProfit / summary.totalPrincipalLent) * 100).toFixed(1)}% Return
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* REALIZATION METRICS ROW: PROFIT EARNED, PENDING PROFIT, TOTAL COLLECTED, DUE BALANCE */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-emerald-800 font-bold block">
                  Profit Earned so Far
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-700 block mt-0.5">
                  {formatINR(summary.totalProfitEarned)}
                </span>
              </div>

              <div className="bg-white border border-amber-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-amber-800 font-bold block">
                  Pending Profit to Collect
                </span>
                <span className="text-base sm:text-lg font-black text-amber-900 block mt-0.5">
                  {formatINR(summary.totalPendingProfit)}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-slate-600 font-bold block">
                  Total Collected Overall
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 block mt-0.5">
                  {formatINR(summary.totalCollectedOverall)}
                </span>
              </div>

              <div className="bg-white border border-rose-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-rose-800 font-bold block">
                  Outstanding Due Balance
                </span>
                <span className="text-base sm:text-lg font-black text-rose-900 block mt-0.5">
                  {formatINR(summary.totalDueAmount)}
                </span>
              </div>
            </div>

            {/* WEEKLY VS MONTHLY LOAN BREAKDOWN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Weekly Loans */}
              <div className="bg-white border border-indigo-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <strong className="text-xs text-indigo-950 font-bold">வாரக் கடன் (Weekly Loans)</strong>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {summary.weeklyCount} Customers
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">கொடுத்த அசல்</span>
                    <strong className="text-slate-900 font-bold">{formatINR(summary.weeklyPrincipalLent)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-sky-700 block">வட்டியுடன் வரவு</span>
                    <strong className="text-sky-900 font-bold">{formatINR(summary.weeklyTargetWithInterest)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block">வரும் லாபம்</span>
                    <strong className="text-emerald-700 font-bold">+{formatINR(summary.weeklyExpectedProfit)}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 text-slate-600">
                  <span>வசூலானது: <strong className="text-slate-800">{formatINR(summary.weeklyCollected)}</strong></span>
                  <span>பாக்கி: <strong className="text-amber-800">{formatINR(summary.weeklyDueRemaining)}</strong></span>
                </div>
              </div>

              {/* Monthly Loans */}
              <div className="bg-white border border-indigo-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <strong className="text-xs text-indigo-950 font-bold">மாதக் கடன் (Monthly Loans)</strong>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {summary.monthlyCount} Customers
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">கொடுத்த அசல்</span>
                    <strong className="text-slate-900 font-bold">{formatINR(summary.monthlyPrincipalLent)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-sky-700 block">வட்டியுடன் வரவு</span>
                    <strong className="text-sky-900 font-bold">{formatINR(summary.monthlyTargetWithInterest)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block">வரும் லாபம்</span>
                    <strong className="text-emerald-700 font-bold">+{formatINR(summary.monthlyExpectedProfit)}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 text-slate-600">
                  <span>வசூலானது: <strong className="text-slate-800">{formatINR(summary.monthlyCollected)}</strong></span>
                  <span>பாக்கி: <strong className="text-amber-800">{formatINR(summary.monthlyDueRemaining)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: WEEKLY COLLECTION FILTER */}
          <div className="bg-slate-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Weekly Collection Filter</h3>
                </div>
              </div>

              {/* Date span badge */}
              <div className="text-[11px] font-mono text-emerald-900 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg">
                {filterResults.startDateStr} to {filterResults.endDateStr}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl mb-4">
              <button
                type="button"
                id="btn-filter-this-week"
                onClick={() => setWeeklyFilter('this_week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  weeklyFilter === 'this_week'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                This Week
              </button>

              <button
                type="button"
                id="btn-filter-last-week"
                onClick={() => setWeeklyFilter('last_week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  weeklyFilter === 'last_week'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Last Week
              </button>

              <button
                type="button"
                id="btn-filter-last-4-weeks"
                onClick={() => setWeeklyFilter('last_4_weeks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  weeklyFilter === 'last_4_weeks'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Past 4 Weeks
              </button>

              <button
                type="button"
                id="btn-filter-custom"
                onClick={() => setWeeklyFilter('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  weeklyFilter === 'custom'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Custom Dates
              </button>
            </div>

            {/* Custom Date Pickers (if custom selected) */}
            {weeklyFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl mb-4 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Start Date:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">End Date:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Filter Metrics Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              <div className="bg-white border border-emerald-300 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-emerald-800 font-bold block mb-0.5">
                  Total Collected
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700">
                  {formatINR(filterResults.totalCollected)}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-slate-500 block mb-0.5">Payments Received</span>
                <span className="text-lg sm:text-xl font-black text-slate-900">
                  {filterResults.collectionsCount} <span className="text-xs font-normal text-slate-500">collections</span>
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-slate-500 block mb-0.5">Total Dues Reduced</span>
                <span className="text-lg sm:text-xl font-black text-indigo-700">
                  {formatINR(filterResults.totalCollected)}
                </span>
              </div>
            </div>

            {/* 4 Weeks Breakdown Table if Selected */}
            {weeklyFilter === 'last_4_weeks' && filterResults.weeklyBreakdown && (
              <div className="mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-700">
                  Week-by-Week Collection Comparison
                </div>
                <div className="divide-y divide-slate-100">
                  {filterResults.weeklyBreakdown.map((w, idx) => (
                    <div key={idx} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-900 block">{w.weekLabel}</span>
                        <span className="text-[10px] text-slate-500">{w.start} to {w.end}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-emerald-700 block">{formatINR(w.totalCollected)}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{w.count} dues collected</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entries List for Filtered Period */}
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Filtered Payment Entries ({displayEntries.length})</span>
                </h4>

                <div className="relative">
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Search entry..."
                    className="text-[11px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {displayEntries.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">
                  No payment collections recorded during this period.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {displayEntries.map((entry) => (
                    <div
                      key={entry.txId}
                      className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl text-xs border border-slate-200 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{entry.customerName}</span>
                        <span className="text-[10px] text-slate-500">{entry.village} • {entry.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-800 block text-sm">
                            {formatINR(entry.amountPaid)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleShareReceipt(entry)}
                          title="Share WhatsApp Receipt"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: PC DATABASE, LIVE AUTO-SAVE & BACKUP */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-indigo-50/20 border-2 border-slate-300 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Cloud Database, Backup & Restore
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-xl text-[11px] text-emerald-900 font-bold self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>ஆட்டோ-சேவ்: {lastSavedInApp}</span>
              </div>
            </div>

            {/* FIREBASE CLOUD DATABASE STATUS CARD */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${isCloudSynced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Firebase Cloud Database (நிரந்தர கிளவுட் சேமிப்பு)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Database: <span className="font-mono text-emerald-800 font-bold">ai-studio-palaniyandavarfi</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCloudSynced ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>Connected & Synced</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                      <span>Offline Mode</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-700 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-medium">இணைக்கப்பட்டுள்ள கணக்கு (Account):</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {currentUserEmail || 'Offline (admin/123) - Google Login தேவை'}
                  </span>
                </div>

                {onForceSyncCloud && (
                  <button
                    type="button"
                    onClick={onForceSyncCloud}
                    className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                    <span>தற்போதைய அனைத்து தரவுகளையும் Firebase-ல் Sync செய்க (Sync Now)</span>
                  </button>
                )}

                {/* Helpful instructions for Phone vs Laptop sync */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5 text-[11px] text-indigo-950 leading-relaxed">
                  <span className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>லேப்டாப் மற்றும் போனில் ஒரே நேரத்தில் Sync செய்வது எப்படி?</span>
                  </span>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700">
                    <li>
                      உங்கள் லேப்டாப் மற்றும் போன் இரண்டிலும் <strong>ஒரே Google கணக்கு ({currentUserEmail || 'Gmail'})</strong> மூலம் உள்நுழையவும்.
                    </li>
                    <li>
                      சாதா <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-slate-700">admin / 123</code> என்பது அந்த சாதனத்திற்கான ஆஃப்லைன் லாகின் மட்டுமே.
                    </li>
                    <li>
                      ஒரே Google கணக்கில் லாகின் செய்தால், போனில் வசூல் பதிவிடும் ஒவ்வொரு முறையும் லேப்டாப்பில் உடனுக்குடன் தானாகவே மாறிவிடும்!
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* 1-CLICK BACKUP DOWNLOAD */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    டேட்டா பேக்கப் ஃபைல் (Data Backup File)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    உங்கள் வாடிக்கையாளர்கள் மற்றும் வரவு விவரங்களை ஒரே கிளிக்கில் கோப்பாக சேமித்துக் கொள்ளலாம்
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  id="btn-export-pc-json"
                  onClick={handleExportJSON}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-5 h-5 shrink-0" />
                  <span>Download Backup File (.json)</span>
                </button>
              </div>
            </div>



            {/* RESTORE BACKUP & CLEAR */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                id="btn-restore-pc-backup"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Restore Backup File (மீட்டமை)</span>
              </button>

              <button
                type="button"
                id="btn-clear-all-data"
                onClick={handleConfirmClear}
                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Clear All Data</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* SECTION 4: LOGOUT */}
          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="py-2 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-slate-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

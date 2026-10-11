import React, { useMemo } from 'react';
import { MapPin, Search, Calendar, X } from 'lucide-react';
import { Customer, LoanType } from '../types';

interface VillageTabsProps {
  customers: Customer[];
  selectedVillage: string;
  onSelectVillage: (village: string) => void;
  selectedLoanType: 'all' | LoanType;
  onSelectLoanType: (type: 'all' | LoanType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const VillageTabs: React.FC<VillageTabsProps> = ({
  customers,
  selectedVillage,
  onSelectVillage,
  selectedLoanType,
  onSelectLoanType,
  searchQuery,
  onSearchChange,
}) => {
  // Aggregate villages case-insensitively and cleanly format display names
  const villageGroups = useMemo(() => {
    const map = new Map<string, { displayName: string; count: number; weeklyCount: number; monthlyCount: number }>();

    customers.forEach((c) => {
      const raw = (c.village || '').trim() || 'General';
      const key = raw.replace(/\s+/g, ' ').toLowerCase();
      // Capitalize first letter of each word for display
      const display = raw
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const existing = map.get(key);
      const isWeekly = (c.loanType || 'weekly') === 'weekly';

      if (existing) {
        existing.count += 1;
        if (isWeekly) existing.weeklyCount += 1;
        else existing.monthlyCount += 1;
      } else {
        map.set(key, {
          displayName: display,
          count: 1,
          weeklyCount: isWeekly ? 1 : 0,
          monthlyCount: isWeekly ? 0 : 1,
        });
      }
    });

    return Array.from(map.entries())
      .map(([key, data]) => ({
        key,
        displayName: data.displayName,
        count: data.count,
        weeklyCount: data.weeklyCount,
        monthlyCount: data.monthlyCount,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [customers]);

  const normSelected = selectedVillage.trim().toLowerCase();

  return (
    <div className="space-y-3 mb-6">
      {/* Top Search & Loan Type Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="customer-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search customer name, phone number, or village..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-700 cursor-pointer font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Loan Type Filter (All / Weekly / Monthly) */}
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-300 rounded-2xl shrink-0 shadow-2xs">
          <button
            id="filter-type-all"
            onClick={() => onSelectLoanType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              selectedLoanType === 'all'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Loans
          </button>
          <button
            id="filter-type-weekly"
            onClick={() => onSelectLoanType('weekly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              selectedLoanType === 'weekly'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3 h-3" />
            Weekly
          </button>
          <button
            id="filter-type-monthly"
            onClick={() => onSelectLoanType('monthly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              selectedLoanType === 'monthly'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3 h-3" />
            Monthly
          </button>
        </div>
      </div>

      {/* Village Wise Grouping Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold whitespace-nowrap pl-1 pr-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Villages:</span>
        </div>

        <button
          id="village-pill-all"
          onClick={() => onSelectVillage('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedVillage === 'all'
              ? 'bg-slate-900 text-white font-bold shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>All Villages</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedVillage === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {customers.length}
          </span>
        </button>

        {villageGroups.map((group) => {
          const isSelected = selectedVillage !== 'all' && normSelected === group.key;
          return (
            <button
              key={group.key}
              id={`village-pill-${group.key}`}
              onClick={() => {
                // If already selected, clicking it again resets to all villages
                if (isSelected) {
                  onSelectVillage('all');
                } else {
                  onSelectVillage(group.displayName);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs ring-2 ring-emerald-400/40'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{group.displayName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {group.count}
              </span>
              {isSelected && (
                <span title="Deselect village" className="text-white/80 hover:text-white ml-0.5">
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

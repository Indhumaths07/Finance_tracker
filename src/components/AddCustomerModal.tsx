import React, { useState } from 'react';
import { 
  X, UserPlus, Phone, MapPin, Calendar, Coins, Check 
} from 'lucide-react';
import { Customer, LoanType, InterestUnit } from '../types';

interface AddCustomerModalProps {
  onClose: () => void;
  onSaveCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'transactions'>) => void;
  existingVillages: string[];
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  onClose,
  onSaveCustomer,
  existingVillages,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState(existingVillages[0] || '');
  
  // Default values for loan
  const [principalAmount, setPrincipalAmount] = useState<number | ''>(5000);
  const [loanType, setLoanType] = useState<LoanType>('weekly');
  
  // Monthly parameters
  const [interestRate, setInterestRate] = useState<number>(2.0); // 2% per month
  const [interestUnit] = useState<InterestUnit>('percent_per_month');
  
  // Weekly parameters (defaults tailored for weekly business e.g. 5000 -> 10 wks x 600 = 6000)
  const [initialBalance, setInitialBalance] = useState<number | ''>(6000);
  const [weeklyDueAmount, setWeeklyDueAmount] = useState<number | ''>(600);
  const [tenureWeeks, setTenureWeeks] = useState<number>(10);
  const [totalPayableAmount, setTotalPayableAmount] = useState<number | ''>(6000);

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Auto-sync weekly parameters when principal changes
  const handlePrincipalChange = (val: number | '') => {
    setPrincipalAmount(val);
    if (typeof val === 'number') {
      const defaultStartBalance = loanType === 'weekly' ? Math.round(val * 1.2) : val;
      setInitialBalance(defaultStartBalance);
      setTotalPayableAmount(defaultStartBalance);
      const calculatedDue = Math.round(defaultStartBalance / (tenureWeeks || 10));
      setWeeklyDueAmount(calculatedDue);
    }
  };

  const handleStartingBalanceChange = (val: number | '') => {
    setInitialBalance(val);
    setTotalPayableAmount(val);
    if (typeof val === 'number' && tenureWeeks > 0) {
      setWeeklyDueAmount(Math.round(val / tenureWeeks));
    }
  };

  const handleWeeklyDueChange = (val: number | '') => {
    setWeeklyDueAmount(val);
    if (typeof val === 'number' && tenureWeeks > 0) {
      const newTotal = val * tenureWeeks;
      setInitialBalance(newTotal);
      setTotalPayableAmount(newTotal);
    }
  };

  const handleTenureWeeksChange = (weeks: number) => {
    setTenureWeeks(weeks);
    if (typeof weeklyDueAmount === 'number' && weeks > 0) {
      const newTotal = weeklyDueAmount * weeks;
      setInitialBalance(newTotal);
      setTotalPayableAmount(newTotal);
    }
  };

  const handleLoanTypeChange = (type: LoanType) => {
    setLoanType(type);
    if (type === 'weekly') {
      const p = typeof principalAmount === 'number' ? principalAmount : 5000;
      setPrincipalAmount(p);
      const startBal = Math.round(p * 1.2);
      setInitialBalance(startBal);
      setTotalPayableAmount(startBal);
      setTenureWeeks(10);
      setWeeklyDueAmount(Math.round(startBal / 10));
    } else {
      const p = typeof principalAmount === 'number' ? principalAmount : 50000;
      setPrincipalAmount(p);
      setInitialBalance(p);
      setInterestRate(2.0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !principalAmount) return;

    // Clean up village name: trim, remove extra spaces, title-case words
    const rawVillage = village.trim() || 'General';
    const finalVillage = rawVillage
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const numPrincipal = Number(principalAmount);
    const numInitialBalance = initialBalance !== '' ? Number(initialBalance) : numPrincipal;
    const numWeeklyDue = loanType === 'weekly' ? Number(weeklyDueAmount) : undefined;

    onSaveCustomer({
      name: name.trim(),
      phone: phone.trim(),
      village: finalVillage,
      principalAmount: numPrincipal,
      initialBalance: numInitialBalance,
      totalPayableAmount: numInitialBalance,
      weeklyDueAmount: loanType === 'weekly' ? numWeeklyDue : undefined,
      tenureWeeks: loanType === 'weekly' ? Number(tenureWeeks) : undefined,
      startDate,
      loanType,
      interestRate: loanType === 'weekly' ? 0 : Number(interestRate),
      interestUnit,
      status: 'active',
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="add-customer-modal-card"
        className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Add New Customer
              </h2>
              <p className="text-xs text-slate-500">
                Enter Loan Ledger Information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs sm:text-sm text-slate-800">
          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name *
              </label>
              <input
                id="new-customer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Murugan"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  id="new-customer-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Village / Town */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Village / Town *
            </label>
            <div className="space-y-2">
              {existingVillages.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {existingVillages.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVillage(v)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        village.trim().toLowerCase() === v.trim().toLowerCase()
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <input
                  id="new-customer-village"
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Enter village name (e.g. Mettur, Salem, Omalur)"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Loan Type Selection (Weekly / Monthly) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Loan Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="loan-type-weekly-btn"
                onClick={() => handleLoanTypeChange('weekly')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer border transition-all text-center ${
                  loanType === 'weekly'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="block text-sm font-bold">Weekly Loan</span>
                <span className="text-[10px] text-slate-500">Weekly Installment (10 Weeks)</span>
              </button>

              <button
                type="button"
                id="loan-type-monthly-btn"
                onClick={() => handleLoanTypeChange('monthly')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer border transition-all text-center ${
                  loanType === 'monthly'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="block text-sm font-bold">Monthly Loan</span>
                <span className="text-[10px] text-slate-500">Monthly Interest</span>
              </button>
            </div>
          </div>

          {/* Principal Amount & Start Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {loanType === 'weekly' ? 'Given Amount / Principal (₹) *' : 'Principal Amount Lent (₹) *'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700 font-bold">
                  ₹
                </div>
                <input
                  id="new-customer-principal"
                  type="number"
                  min="1"
                  step="any"
                  value={principalAmount}
                  onChange={(e) => handlePrincipalChange(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={loanType === 'weekly' ? '12750' : '50000'}
                  required
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {loanType === 'weekly' ? 'Principal amount handed to customer (e.g. 12750)' : 'Lent amount'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  id="new-customer-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Loan / Interest Configuration */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
              <Coins className="w-4 h-4 text-indigo-600" />
              <span>{loanType === 'weekly' ? 'Weekly Due Settings' : 'Monthly Interest Settings'}</span>
            </div>

            {loanType === 'monthly' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Starting Balance (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-emerald-700 font-bold text-xs">₹</span>
                      <input
                        id="new-customer-monthly-starting-balance"
                        type="number"
                        min="0"
                        step="any"
                        value={initialBalance}
                        onChange={(e) => setInitialBalance(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="50000"
                        required
                        className="w-full pl-6 pr-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Initial balance to subtract repayments from
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Monthly Interest % (₹ per ₹100/mo)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        id="new-customer-interest-rate"
                        type="number"
                        step="any"
                        min="0"
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                      />
                      <span className="text-xs text-slate-600 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      e.g., 2% (₹2 interest per ₹100)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Starting Balance (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-emerald-700 font-bold text-xs">₹</span>
                      <input
                        id="new-customer-starting-balance"
                        type="number"
                        min="0"
                        step="any"
                        value={initialBalance}
                        onChange={(e) => handleStartingBalanceChange(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="15000"
                        required
                        className="w-full pl-6 pr-2.5 py-2 bg-white border border-emerald-400 focus:ring-2 focus:ring-emerald-500 rounded-lg text-slate-900 font-bold text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                      User writes starting balance (subtracted next)
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Weekly Due *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-emerald-700 font-bold text-xs">₹</span>
                      <input
                        id="new-customer-weekly-due"
                        type="number"
                        min="1"
                        step="any"
                        value={weeklyDueAmount}
                        onChange={(e) => handleWeeklyDueChange(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="1275"
                        required
                        className="w-full pl-6 pr-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      e.g., ₹1,275 per week
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Total Weeks *
                    </label>
                    <input
                      id="new-customer-tenure-weeks"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={tenureWeeks}
                      onChange={(e) => handleTenureWeeksChange(Number(e.target.value))}
                      placeholder="10"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      e.g., 10 weeks
                    </span>
                  </div>
                </div>

                {/* Live Weekly Math Preview */}
                <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Starting Balance:</span>
                    <strong className="text-emerald-800 text-sm font-black">
                      ₹{Number(initialBalance || 0).toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div className="text-center px-3 border-x border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Weekly Installment:</span>
                    <strong className="text-indigo-700 font-bold">
                      ₹{Number(weeklyDueAmount || 0)} × {tenureWeeks} wks
                    </strong>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Calculation Mode:</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Auto-Subtracts on Pay
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Remarks
            </label>
            <input
              id="new-customer-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Shop business, weekly collection"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              id="save-new-customer-btn"
              type="submit"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Customer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

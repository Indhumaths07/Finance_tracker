import React, { useState } from 'react';
import { 
  X, Pencil, Phone, MapPin, Calendar, Coins, Check, FileText, CheckCircle2, Trash2, AlertTriangle 
} from 'lucide-react';
import { Customer, LoanType, InterestUnit } from '../types';
import { formatINR } from '../utils/financeCalculations';

interface EditCustomerModalProps {
  customer: Customer;
  existingVillages: string[];
  onClose: () => void;
  onUpdateCustomer: (updated: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  customer,
  existingVillages,
  onClose,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [village, setVillage] = useState(customer.village);
  const [loanType, setLoanType] = useState<LoanType>(customer.loanType || 'weekly');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // Principal & balance
  const [principalAmount, setPrincipalAmount] = useState<number | ''>(customer.principalAmount);
  const [initialBalance, setInitialBalance] = useState<number | ''>(
    customer.initialBalance ?? (customer.loanType === 'weekly' ? (customer.totalPayableAmount || customer.principalAmount) : customer.principalAmount)
  );

  // Weekly parameters
  const [weeklyDueAmount, setWeeklyDueAmount] = useState<number | ''>(
    customer.weeklyDueAmount ?? (customer.initialBalance && customer.tenureWeeks ? Math.round(customer.initialBalance / customer.tenureWeeks) : 600)
  );
  const [tenureWeeks, setTenureWeeks] = useState<number>(customer.tenureWeeks || 10);
  
  // Monthly parameters
  const [interestRate, setInterestRate] = useState<number>(customer.interestRate || 2.0);
  const [interestUnit] = useState<InterestUnit>(customer.interestUnit || 'percent_per_month');

  // Dates & metadata
  const [startDate, setStartDate] = useState(customer.startDate || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'active' | 'closed'>(customer.status || 'active');
  const [notes, setNotes] = useState(customer.notes || '');

  // Quick auto-sync if principal is changed and user wants to recalculate
  const handlePrincipalChange = (val: number | '') => {
    setPrincipalAmount(val);
  };

  const handleStartingBalanceChange = (val: number | '') => {
    setInitialBalance(val);
    if (typeof val === 'number' && tenureWeeks > 0 && loanType === 'weekly') {
      setWeeklyDueAmount(Math.round(val / tenureWeeks));
    }
  };

  const handleWeeklyDueChange = (val: number | '') => {
    setWeeklyDueAmount(val);
    if (typeof val === 'number' && tenureWeeks > 0) {
      setInitialBalance(val * tenureWeeks);
    }
  };

  const handleTenureWeeksChange = (weeks: number) => {
    setTenureWeeks(weeks);
    if (typeof weeklyDueAmount === 'number' && weeks > 0) {
      setInitialBalance(weeklyDueAmount * weeks);
    }
  };

  const handleLoanTypeChange = (type: LoanType) => {
    setLoanType(type);
    if (type === 'weekly' && (!weeklyDueAmount || weeklyDueAmount === 0)) {
      const p = typeof principalAmount === 'number' ? principalAmount : 5000;
      const startBal = typeof initialBalance === 'number' && initialBalance > 0 ? initialBalance : Math.round(p * 1.2);
      setInitialBalance(startBal);
      setWeeklyDueAmount(Math.round(startBal / (tenureWeeks || 10)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || principalAmount === '') return;

    // Clean up village name: trim, capitalize
    const rawVillage = village.trim() || 'General';
    const finalVillage = rawVillage
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const numPrincipal = Number(principalAmount);
    const numInitialBalance = initialBalance !== '' ? Number(initialBalance) : numPrincipal;
    const numWeeklyDue = loanType === 'weekly' ? (weeklyDueAmount !== '' ? Number(weeklyDueAmount) : undefined) : undefined;

    const updatedCustomer: Customer = {
      ...customer,
      name: name.trim(),
      phone: phone.trim(),
      village: finalVillage,
      principalAmount: numPrincipal,
      initialBalance: numInitialBalance,
      totalPayableAmount: numInitialBalance,
      weeklyDueAmount: numWeeklyDue,
      tenureWeeks: loanType === 'weekly' ? Number(tenureWeeks) : undefined,
      interestRate: loanType === 'weekly' ? 0 : Number(interestRate),
      interestUnit,
      startDate,
      loanType,
      status,
      notes: notes.trim() || undefined,
    };

    onUpdateCustomer(updatedCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="edit-customer-modal-card"
        className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Edit Customer Data
              </h2>
              <p className="text-xs text-slate-500">
                Update Profile, Loan Details & Starting Balance
              </p>
            </div>
          </div>
          <button
            id="close-edit-customer-modal"
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
                id="edit-customer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Murugan"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  id="edit-customer-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
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
                  id="edit-customer-village"
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Enter village name (e.g. Mettur, Salem)"
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
                id="edit-loan-type-weekly-btn"
                onClick={() => handleLoanTypeChange('weekly')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer border transition-all text-center ${
                  loanType === 'weekly'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="block text-sm font-bold">Weekly Loan</span>
                <span className="text-[10px] text-slate-500">Weekly Installments</span>
              </button>

              <button
                type="button"
                id="edit-loan-type-monthly-btn"
                onClick={() => handleLoanTypeChange('monthly')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer border transition-all text-center ${
                  loanType === 'monthly'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-2xs'
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
                {loanType === 'weekly' ? 'Principal Lent Amount (₹) *' : 'Principal Amount Lent (₹) *'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700 font-bold">
                  ₹
                </div>
                <input
                  id="edit-customer-principal"
                  type="number"
                  min="1"
                  step="any"
                  value={principalAmount}
                  onChange={(e) => handlePrincipalChange(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="12750"
                  required
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Amount given to customer (e.g. 12750 or any amount)
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
                  id="edit-customer-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Loan / Balance Settings */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
              <Coins className="w-4 h-4 text-indigo-600" />
              <span>{loanType === 'weekly' ? 'Weekly Due & Balance Settings' : 'Monthly Interest & Starting Balance'}</span>
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
                        id="edit-customer-monthly-starting-balance"
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
                      Balance from which repayments are deducted
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Monthly Interest % (₹ per ₹100/mo)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        id="edit-customer-interest-rate"
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
                      e.g. 2% (₹2 interest per ₹100)
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
                        id="edit-customer-starting-balance"
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
                      Total collection balance
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Weekly Due (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-emerald-700 font-bold text-xs">₹</span>
                      <input
                        id="edit-customer-weekly-due"
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
                      Due amount per week
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Total Weeks *
                    </label>
                    <input
                      id="edit-customer-tenure-weeks"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={tenureWeeks}
                      onChange={(e) => handleTenureWeeksChange(Number(e.target.value))}
                      placeholder="10"
                      required
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      e.g. 10 weeks
                    </span>
                  </div>
                </div>

                {/* Calculation breakdown hint */}
                {typeof initialBalance === 'number' && typeof principalAmount === 'number' && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 text-slate-600">
                    <span>
                      Given: <strong>{formatINR(principalAmount)}</strong>
                    </span>
                    <span>
                      Target: <strong>{formatINR(initialBalance)}</strong>
                    </span>
                    {initialBalance > principalAmount && (
                      <span className="text-emerald-700 font-bold">
                        Profit: +{formatINR(initialBalance - principalAmount)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Status
              </label>
              <select
                id="edit-customer-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'closed')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="active">Active (பாக்கி உள்ளது)</option>
                <option value="closed">Closed (முடிக்கப்பட்டது)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes / Reference
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <input
                  id="edit-customer-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Shop owner, guarantor details..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Existing payment records note */}
          {customer.transactions && customer.transactions.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                This customer has <strong>{customer.transactions.length}</strong> recorded payment(s). All payment history is safely preserved.
              </span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
            {onDeleteCustomer ? (
              <button
                type="button"
                id="btn-edit-modal-delete"
                onClick={() => setShowConfirmDelete(true)}
                className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Delete Customer / கஸ்டமரை நீக்கு"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Delete Customer</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                id="btn-cancel-edit-customer"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-edit-customer"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* CONFIRM DELETE CUSTOMER MODAL OVERLAY */}
      {showConfirmDelete && (
        <div 
          id="edit-confirm-delete-modal"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Customer?
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  கஸ்டமரை நிரந்தரமாக நீக்கவா?
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 space-y-2 text-xs text-slate-700">
              <div>
                <span className="text-slate-500 font-medium">Customer: </span>
                <strong className="text-slate-900 text-sm">{customer.name}</strong>
                <span className="text-slate-500 ml-1">({customer.village})</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Phone: </span>
                <span className="font-mono text-slate-800">{customer.phone}</span>
              </div>
              <p className="text-[11px] text-rose-800 pt-1.5 border-t border-rose-200 font-medium leading-relaxed">
                ⚠️ Warning: Are you sure you want to permanently delete {customer.name}? All payment records and history ({customer.transactions?.length || 0} entries) will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-edit-delete-confirm"
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-edit-delete"
                onClick={() => {
                  onDeleteCustomer?.(customer.id);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Customer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

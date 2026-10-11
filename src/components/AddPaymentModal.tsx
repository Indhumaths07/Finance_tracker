import React, { useState } from 'react';
import { 
  X, Calculator, Calendar, Coins, 
  Share2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Customer, Transaction } from '../types';
import { 
  formatINR, formatVattiLabel, getCustomerBalanceDetails, 
  calculateMonthsAndDays, calculateWeeksAndDays, generateWhatsAppReceipt 
} from '../utils/financeCalculations';

interface AddPaymentModalProps {
  customer: Customer | null;
  onClose: () => void;
  onSavePayment: (customerId: string, tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  customer,
  onClose,
  onSavePayment,
}) => {
  if (!customer) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [interestPortion, setInterestPortion] = useState<number | ''>('');
  const [principalPortion, setPrincipalPortion] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'gpay' | 'phonepe' | 'bank'>('cash');
  const [notes, setNotes] = useState('');
  const [paymentOption, setPaymentOption] = useState<string>('full_weekly');
  const [isMissedWeekSelected, setIsMissedWeekSelected] = useState(false);
  const [savedTx, setSavedTx] = useState<Omit<Transaction, 'id' | 'createdAt'> | null>(null);

  // Dynamic balance details based on chosen payment date
  const balanceDetails = getCustomerBalanceDetails(customer, paymentDate);
  const currentPrincipal = balanceDetails.remainingPrincipal;
  const accruedInterest = balanceDetails.estimatedAccruedInterest;
  const isWeekly = customer.loanType === 'weekly';
  const weeklyDue = balanceDetails.weeklyDue || 600;

  // Elapsed time breakdown
  const timeDetails = isWeekly
    ? calculateWeeksAndDays(balanceDetails.lastCalcDate, paymentDate)
    : calculateMonthsAndDays(balanceDetails.lastCalcDate, paymentDate);

  // Auto-allocate when amountPaid changes
  const handleAmountChange = (val: string) => {
    setIsMissedWeekSelected(false);
    if (val === '') {
      setAmountPaid('');
      setInterestPortion('');
      setPrincipalPortion('');
      return;
    }
    const num = Number(val);
    setAmountPaid(num);

    if (isWeekly) {
      const profit = Math.round(num * (balanceDetails.profitRatio || 0));
      setInterestPortion(profit);
      setPrincipalPortion(num - profit);
    } else {
      if (num <= accruedInterest) {
        setInterestPortion(num);
        setPrincipalPortion(0);
      } else {
        setInterestPortion(accruedInterest);
        const leftover = num - accruedInterest;
        setPrincipalPortion(Math.min(leftover, currentPrincipal));
      }
    }
  };

  // Handle dropdown selection
  const handleOptionDropdownChange = (opt: string) => {
    setPaymentOption(opt);
    if (isWeekly) {
      if (opt === 'full_weekly') {
        setIsMissedWeekSelected(false);
        handleAmountChange(weeklyDue.toString());
        setNotes('Full week due paid');
      } else if (opt === 'partial_weekly') {
        setIsMissedWeekSelected(false);
        const half = Math.round(weeklyDue / 2);
        handleAmountChange(half.toString());
        setNotes('Partial week payment');
      } else if (opt === 'missed_week') {
        setIsMissedWeekSelected(true);
        setAmountPaid(0);
        setInterestPortion(0);
        setPrincipalPortion(0);
        setNotes('Missed week');
      } else {
        setIsMissedWeekSelected(false);
        setAmountPaid('');
        setInterestPortion('');
        setPrincipalPortion('');
        setNotes('');
      }
    } else {
      if (opt === 'interest_only') {
        setIsMissedWeekSelected(false);
        setAmountPaid(accruedInterest);
        setInterestPortion(accruedInterest);
        setPrincipalPortion(0);
        setNotes('Interest only payment');
      } else if (opt === 'full_settle') {
        setIsMissedWeekSelected(false);
        const total = currentPrincipal + accruedInterest;
        setAmountPaid(total);
        setInterestPortion(accruedInterest);
        setPrincipalPortion(currentPrincipal);
        setNotes('Full loan settlement');
      } else {
        setIsMissedWeekSelected(false);
        setAmountPaid('');
        setInterestPortion('');
        setPrincipalPortion('');
        setNotes('');
      }
    }
  };

  const numAmountPaid = isMissedWeekSelected ? 0 : Number(amountPaid || 0);
  const numInterestPortion = isMissedWeekSelected ? 0 : Number(interestPortion || 0);
  const numPrincipalPortion = isMissedWeekSelected ? 0 : Number(principalPortion || 0);

  // Exact step-by-step subtraction
  const newBalance = isMissedWeekSelected 
    ? currentPrincipal 
    : (isWeekly 
        ? Math.max(0, currentPrincipal - numAmountPaid) 
        : Math.max(0, currentPrincipal - numPrincipalPortion));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMissedWeekSelected && numAmountPaid <= 0) return;

    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: paymentDate,
      amountPaid: numAmountPaid,
      interestPortion: numInterestPortion,
      principalPortion: numPrincipalPortion,
      balanceAfter: newBalance,
      paymentMode,
      isMissedWeek: isMissedWeekSelected || numAmountPaid === 0,
      notes: notes.trim() || (isMissedWeekSelected ? 'Missed week' : undefined),
    };

    onSavePayment(customer.id, newTx);
    setSavedTx(newTx);
  };

  const handleManualShareWhatsApp = () => {
    if (!savedTx) return;
    const text = generateWhatsAppReceipt(customer, savedTx);
    window.open(`https://wa.me/91${customer.phone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="add-payment-modal-card"
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Record Payment & Balance Update
              </h2>
              <p className="text-xs text-slate-500">
                Customer: <span className="font-bold text-slate-900">{customer.name}</span> ({customer.village})
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* Success Notification after Save with Explicit Share Button */}
          {savedTx ? (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-3 text-center animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">Payment Recorded Successfully!</h3>
                <p className="text-xs text-emerald-800 mt-1">
                  Amount: <strong>{formatINR(savedTx.amountPaid)}</strong> | Remaining Balance: <strong>{formatINR(savedTx.balanceAfter)}</strong>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  id="btn-whatsapp-manual-share"
                  onClick={handleManualShareWhatsApp}
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Receipt via WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* CURRENT BALANCE BANNER */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total / Target</span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    {formatINR(isWeekly ? (balanceDetails.targetCollection || customer.principalAmount) : customer.principalAmount)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-indigo-600 uppercase font-semibold block">
                    {isWeekly ? 'Weekly Due' : 'Accrued Interest'}
                  </span>
                  <span className="text-base font-bold text-indigo-700 block mt-0.5">
                    {isWeekly ? formatVattiLabel(customer) : formatINR(accruedInterest)}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 uppercase font-bold block">Current Balance</span>
                  <span className="text-base font-black text-amber-900 block mt-0.5">
                    {formatINR(currentPrincipal)}
                  </span>
                </div>
              </div>

              {/* PAYMENT OPTION DROPDOWN */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Payment Options:
                </label>
                <select
                  id="add-payment-option-select"
                  value={paymentOption}
                  onChange={(e) => handleOptionDropdownChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {isWeekly ? (
                    <>
                      <option value="full_weekly">
                        Full Week Due (₹{weeklyDue})
                      </option>
                      <option value="partial_weekly">
                        Partial Payment (₹{Math.round(weeklyDue / 2)})
                      </option>
                      <option value="missed_week">
                        Missed Week (₹0)
                      </option>
                      <option value="custom">
                        Custom Amount
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="interest_only">
                        Interest Only (₹{accruedInterest})
                      </option>
                      <option value="full_settle">
                        Full Settlement (₹{currentPrincipal + accruedInterest})
                      </option>
                      <option value="custom">
                        Custom Amount
                      </option>
                    </>
                  )}
                </select>
              </div>

              {/* DATE & AMOUNT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      id="payment-date-input"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isMissedWeekSelected ? 'Missed Week Status' : 'Amount Received (₹)'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700 font-bold text-sm">
                      ₹
                    </div>
                    <input
                      id="payment-amount-input"
                      type="number"
                      min="0"
                      step="any"
                      disabled={isMissedWeekSelected}
                      value={isMissedWeekSelected ? 0 : amountPaid}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder={isWeekly ? String(weeklyDue) : '2000'}
                      required={!isMissedWeekSelected}
                      className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 ${
                        isMissedWeekSelected
                          ? 'bg-rose-50 border border-rose-300 text-rose-700'
                          : 'bg-white border border-slate-300 text-slate-900 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* PAYMENT MODE & NOTES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    id="payment-mode-select"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="cash">Cash</option>
                    <option value="gpay">Google Pay (GPay)</option>
                    <option value="phonepe">PhonePe</option>
                    <option value="bank">Bank Transfer / IMPS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Reference (Optional)
                  </label>
                  <input
                    id="payment-notes-input"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paid at shop, week 3"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* LIVE BALANCE AFTER SUBTRACTION */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-800 block">Balance After Payment:</span>
                  <span className="text-xl font-black text-emerald-950 block mt-0.5">
                    {formatINR(newBalance)}
                  </span>
                </div>
                {isMissedWeekSelected && (
                  <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold">
                    Skipped (No minus)
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Note: WhatsApp receipt share button will be provided after recording. No automated popup.
              </p>

              {/* SUBMIT BUTTON */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-save-payment"
                  type="submit"
                  disabled={!isMissedWeekSelected && (!amountPaid || Number(amountPaid) <= 0)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    isMissedWeekSelected
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                      : amountPaid && Number(amountPaid) > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isMissedWeekSelected ? 'Record Missed Week' : 'Confirm & Save Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

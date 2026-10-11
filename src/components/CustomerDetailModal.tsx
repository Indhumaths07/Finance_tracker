import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Phone, MessageSquare, Plus, Calendar, Coins, 
  MapPin, Trash2, Share2, Check,
  ChevronDown, ChevronUp, User, Clock, CheckCircle2, AlertCircle, Pencil
} from 'lucide-react';
import { Customer, Transaction } from '../types';
import { 
  formatINR, formatVattiLabel, getCustomerBalanceDetails, 
  generateWhatsAppReceipt, getChronologicalTransactionsWithRunningBalance 
} from '../utils/financeCalculations';

interface CustomerDetailModalProps {
  customer: Customer | null;
  existingVillages?: string[];
  onClose: () => void;
  onUpdateCustomer?: (updated: Customer) => void;
  onOpenEditCustomer?: (customer: Customer) => void;
  onSavePayment: (customerId: string, tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onDeleteCustomer: (customerId: string) => void;
  onDeleteTransaction: (customerId: string, txId: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  existingVillages = [],
  onClose,
  onUpdateCustomer,
  onOpenEditCustomer,
  onSavePayment,
  onDeleteCustomer,
  onDeleteTransaction,
}) => {
  const [showCustomerCard, setShowCustomerCard] = useState(false);
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(false);

  // Edit Customer Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(customer?.name || '');
  const [editPhone, setEditPhone] = useState(customer?.phone || '');
  const [editVillage, setEditVillage] = useState(customer?.village || '');
  const [editStartingBalance, setEditStartingBalance] = useState<number | ''>(
    customer ? (customer.initialBalance ?? (customer.loanType === 'weekly' ? (customer.totalPayableAmount || customer.principalAmount) : customer.principalAmount)) : ''
  );
  const [editNotes, setEditNotes] = useState(customer?.notes || '');

  // Keep edit state in sync with customer
  useEffect(() => {
    if (customer) {
      setEditName(customer.name);
      setEditPhone(customer.phone);
      setEditVillage(customer.village);
      setEditStartingBalance(
        customer.initialBalance ?? (customer.loanType === 'weekly' ? (customer.totalPayableAmount || customer.principalAmount) : customer.principalAmount)
      );
      setEditNotes(customer.notes || '');
    }
  }, [customer]);

  // Sheet / Passbook inline entry state
  const todayStr = new Date().toISOString().split('T')[0];
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryAmount, setEntryAmount] = useState<number | ''>('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryMode, setEntryMode] = useState<'cash' | 'gpay' | 'phonepe' | 'bank'>('cash');
  const [paymentOption, setPaymentOption] = useState<string>('full_due');
  const [isMissedWeekSelected, setIsMissedWeekSelected] = useState(false);

  // State to show manual Share WhatsApp button after saving (NOT automatic)
  const [lastRecordedTx, setLastRecordedTx] = useState<{
    tx: Omit<Transaction, 'id' | 'createdAt'>;
    customerName: string;
  } | null>(null);

  if (!customer) return null;

  const isWeekly = customer.loanType === 'weekly';
  const details = getCustomerBalanceDetails(customer, entryDate || todayStr);
  const currentPrincipal = details.remainingPrincipal;
  const accruedInterest = details.estimatedAccruedInterest;
  const weeklyDue = details.weeklyDue || 600;

  // Exact step-by-step chronological running balance
  const transactionsChronological = useMemo(() => {
    return getChronologicalTransactionsWithRunningBalance(customer);
  }, [customer]);

  // Display reverse order for list (newest first)
  const displayTransactions = useMemo(() => {
    return [...transactionsChronological].reverse();
  }, [transactionsChronological]);

  // Handle dropdown selection changes
  const handleOptionDropdownChange = (opt: string) => {
    setPaymentOption(opt);
    if (isWeekly) {
      if (opt === 'full_due') {
        setIsMissedWeekSelected(false);
        setEntryAmount(weeklyDue);
        setEntryNotes('Full week due paid');
      } else if (opt === 'partial') {
        setIsMissedWeekSelected(false);
        setEntryAmount(Math.round(weeklyDue / 2));
        setEntryNotes('Partial week payment');
      } else if (opt === 'missed_week') {
        setIsMissedWeekSelected(true);
        setEntryAmount(0);
        setEntryNotes('Missed week');
      } else {
        // custom
        setIsMissedWeekSelected(false);
        setEntryAmount('');
        setEntryNotes('');
      }
    } else {
      // Monthly
      if (opt === 'interest_only') {
        setIsMissedWeekSelected(false);
        setEntryAmount(accruedInterest);
        setEntryNotes('Monthly interest payment');
      } else if (opt === 'full_settle') {
        setIsMissedWeekSelected(false);
        setEntryAmount(currentPrincipal + accruedInterest);
        setEntryNotes('Full loan & interest settlement');
      } else {
        setIsMissedWeekSelected(false);
        setEntryAmount('');
        setEntryNotes('');
      }
    }
  };

  // Quick WhatsApp Ledger Summary (manual click only)
  const handleShareLedgerWhatsApp = () => {
    const text = encodeURIComponent(
`*Palaniyandavar Finance - Customer Ledger Summary*
Customer: *${customer.name}*
Village: *${customer.village}*
Phone: *${customer.phone}*
${isWeekly && details.targetCollection ? `Total Collection: *${formatINR(details.targetCollection)}*\nWeekly Due: *${formatVattiLabel(customer)}*\n` : `Total Amount: *${formatINR(customer.principalAmount)}*\nInterest Rate: *${formatVattiLabel(customer)}*\n`}Remaining Amount: *${formatINR(details.remainingPrincipal)}*
Total Paid: *${formatINR(details.totalPaid)}*
--------------------------------
Thank you!
Palaniyandavar Finance`
    );
    window.open(`https://wa.me/91${customer.phone}?text=${text}`, '_blank');
  };

  const handleShareTxReceipt = (tx: Transaction | (Omit<Transaction, 'id' | 'createdAt'>)) => {
    const text = generateWhatsAppReceipt(customer, tx);
    window.open(`https://wa.me/91${customer.phone}?text=${text}`, '_blank');
  };

  // Inline submit in the passbook sheet
  const handleAddPaymentFromSheet = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = isMissedWeekSelected ? 0 : Number(entryAmount || 0);
    if (!isMissedWeekSelected && numAmount <= 0) return;

    // Smart interest vs principal allocation
    let interestPaid = 0;
    let principalPaid = 0;
    let newBalance = currentPrincipal;

    if (isWeekly) {
      if (isMissedWeekSelected || numAmount === 0) {
        interestPaid = 0;
        principalPaid = 0;
        newBalance = currentPrincipal;
      } else {
        const profit = Math.round(numAmount * (details.profitRatio || 0));
        interestPaid = profit;
        principalPaid = numAmount - profit;
        newBalance = Math.max(0, currentPrincipal - numAmount);
      }
    } else {
      // Monthly loan
      if (numAmount <= accruedInterest) {
        interestPaid = numAmount;
        principalPaid = 0;
      } else {
        interestPaid = accruedInterest;
        principalPaid = Math.min(numAmount - accruedInterest, currentPrincipal);
      }
      newBalance = Math.max(0, currentPrincipal - principalPaid);
    }

    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: entryDate,
      amountPaid: numAmount,
      interestPortion: interestPaid,
      principalPortion: principalPaid,
      balanceAfter: newBalance,
      paymentMode: entryMode,
      isMissedWeek: isMissedWeekSelected || numAmount === 0,
      notes: entryNotes.trim() || (isMissedWeekSelected ? 'Missed week' : undefined),
    };

    onSavePayment(customer.id, newTx);

    // Save for optional manual WhatsApp share (Do NOT automate window.open!)
    setLastRecordedTx({
      tx: newTx,
      customerName: customer.name,
    });

    // Reset entry fields
    setEntryAmount('');
    setEntryNotes('');
    setIsMissedWeekSelected(false);
    setPaymentOption('full_due');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="customer-detail-modal-card"
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-4 sm:my-6 flex flex-col max-h-[94vh]"
      >
        {/* 1. TOP HEADER WITH TOUCHABLE CUSTOMER NAME CIRCLE */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Touchable Customer Avatar Circle & Name */}
            <button
              id="customer-avatar-circle-btn"
              type="button"
              onClick={() => setShowCustomerCard(!showCustomerCard)}
              className="flex items-center gap-3 group text-left p-1.5 -m-1.5 rounded-2xl hover:bg-slate-200/60 active:scale-98 transition-all cursor-pointer"
              title="Touch circle to view customer details"
            >
              {/* The Circle */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-600/20 group-hover:ring-4 group-hover:ring-emerald-500/30 transition-all">
                  {customer.name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-emerald-600 shadow-xs">
                  <User className="w-3 h-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {customer.name}
                  </h2>
                  {showCustomerCard ? (
                    <ChevronUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  )}
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Touch circle for full details • {customer.village}
                </p>
              </div>
            </button>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn-detail-header-edit"
                type="button"
                onClick={() => {
                  if (onOpenEditCustomer) {
                    onOpenEditCustomer(customer);
                  } else {
                    setShowCustomerCard(true);
                    setIsEditingProfile(true);
                  }
                }}
                title="Edit Customer Data"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-600" />
                <span>Edit</span>
              </button>

              <button
                id="btn-detail-header-delete"
                type="button"
                onClick={() => setConfirmDeleteCustomer(true)}
                title="Delete Customer / கஸ்டமரை நீக்கு"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Delete</span>
              </button>

              <button
                onClick={handleShareLedgerWhatsApp}
                title="Share Summary via WhatsApp"
                className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer border border-emerald-200"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                id="close-detail-modal-btn"
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* EXPANDED CUSTOMER DETAILS CARD (When Circle is touched) */}
          {showCustomerCard && (
            <div 
              id="customer-profile-card-dropdown"
              className="mt-3 p-4 bg-white border border-emerald-300 rounded-2xl shadow-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Customer Profile Information
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    Account Since: {customer.startDate}
                  </span>
                  {!isEditingProfile && (
                    <button
                      type="button"
                      id="btn-profile-card-edit"
                      onClick={() => {
                        if (onOpenEditCustomer) {
                          onOpenEditCustomer(customer);
                        } else {
                          setIsEditingProfile(true);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      <Pencil className="w-3 h-3 text-amber-600" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>

              {isEditingProfile ? (
                /* INLINE EDIT FORM */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editName.trim() || !editPhone.trim()) return;
                    const rawVillage = editVillage.trim() || 'General';
                    const finalVillage = rawVillage
                      .split(/\s+/)
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                      .join(' ');
                    const numStartingBal = editStartingBalance !== '' ? Number(editStartingBalance) : customer.principalAmount;
                    const updated: Customer = {
                      ...customer,
                      name: editName.trim(),
                      phone: editPhone.trim(),
                      village: finalVillage,
                      initialBalance: numStartingBal,
                      totalPayableAmount: numStartingBal,
                      notes: editNotes.trim() || undefined,
                    };
                    onUpdateCustomer?.(updated);
                    setIsEditingProfile(false);
                  }}
                  className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {/* Edit Name */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Name *</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                      />
                    </div>

                    {/* Edit Village */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Village / Town *</label>
                      <input
                        type="text"
                        value={editVillage}
                        onChange={(e) => setEditVillage(e.target.value)}
                        required
                        placeholder="e.g. Mettur"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                      />
                      {existingVillages.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {existingVillages.slice(0, 4).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setEditVillage(v)}
                              className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Edit Phone */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Phone Number *</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                      />
                    </div>

                    {/* Edit Starting Balance */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Starting Balance (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editStartingBalance}
                        onChange={(e) => setEditStartingBalance(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setEditName(customer.name);
                        setEditPhone(customer.phone);
                        setEditVillage(customer.village);
                        setEditStartingBalance(
                          customer.initialBalance ?? (customer.loanType === 'weekly' ? (customer.totalPayableAmount || customer.principalAmount) : customer.principalAmount)
                        );
                      }}
                      className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-2xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Name */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-medium">Customer Name</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{customer.name}</span>
                  </div>

                  {/* Village */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-medium">Village / Location</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {customer.village}
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-medium">Phone Number</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm mt-0.5 block">
                      {customer.phone}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Contact & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 border border-emerald-200 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call {customer.phone}</span>
                </a>
                <a
                  href={`https://wa.me/91${customer.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Message</span>
                </a>
                <button
                  onClick={() => setConfirmDeleteCustomer(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 border border-rose-200 transition-colors cursor-pointer ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Customer</span>
                </button>
              </div>

              {confirmDeleteCustomer && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex flex-col sm:flex-row items-center justify-between gap-2 mt-2">
                  <span>Are you sure you want to delete this customer record completely?</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmDeleteCustomer(false)}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg cursor-pointer font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => onDeleteCustomer(customer.id)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. THREE DEDICATED METRIC CARDS: Starting Balance, Weekly Due / Rate, Remaining Balance */}
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {/* Starting Balance */}
            <div className="bg-white border border-slate-200 p-3 sm:p-3.5 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Starting Balance
              </span>
              <div className="mt-1">
                <span className="text-base sm:text-xl font-black text-slate-900 block">
                  {formatINR(details.startingBalance || details.targetCollection || customer.principalAmount)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  Given: {formatINR(customer.principalAmount)}
                </span>
              </div>
            </div>

            {/* Interest Rate / Weekly Due */}
            <div className="bg-white border border-slate-200 p-3 sm:p-3.5 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
                {isWeekly ? 'Weekly Due' : 'Interest Rate'}
              </span>
              <div className="mt-1">
                <span className="text-base sm:text-xl font-black text-indigo-700 block truncate">
                  {formatVattiLabel(customer)}
                </span>
                {isWeekly && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {details.totalWeeks} Weeks ({details.paidWeeks} paid)
                  </span>
                )}
              </div>
            </div>

            {/* Remaining Amount */}
            <div className="bg-amber-50/70 border border-amber-200 p-3 sm:p-3.5 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Remaining Balance
              </span>
              <div className="mt-1">
                <span className="text-base sm:text-xl font-black text-amber-900 block">
                  {formatINR(details.remainingPrincipal)}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                  Paid: {formatINR(details.totalPaid)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SCROLLABLE PASSBOOK SHEET & PAYMENT LIST VIEW */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-white">
          {/* Recent Payment Saved Notification with Manual WhatsApp Share Button */}
          {lastRecordedTx && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-emerald-900 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Payment of <strong>{formatINR(lastRecordedTx.tx.amountPaid)}</strong> saved for <strong>{lastRecordedTx.customerName}</strong>!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-manual-whatsapp-receipt"
                  onClick={() => handleShareTxReceipt(lastRecordedTx.tx)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share WhatsApp Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLastRecordedTx(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* INLINE PASSBOOK FILL ENTRY SHEET */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Passbook Payment Entry Sheet
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Record payment below (Full due, partial, or missed week)
                  </p>
                </div>
              </div>
            </div>

            {/* REPAYMENT OPTIONS DROPDOWN */}
            <div className="mb-3.5 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
                Payment Option:
              </label>
              <select
                id="sheet-repayment-option-select"
                value={paymentOption}
                onChange={(e) => handleOptionDropdownChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {isWeekly ? (
                  <>
                    <option value="full_due">
                      Full Week Due (₹{weeklyDue})
                    </option>
                    <option value="partial">
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

            {/* DIRECT FILL FORM */}
            <form onSubmit={handleAddPaymentFromSheet} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                {/* Date Given */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Date Given
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="sheet-entry-date"
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      required
                      className="w-full pl-9 pr-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                {/* Amount Given */}
                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      {isMissedWeekSelected ? 'Missed Week (₹0)' : 'Amount Given (₹)'}
                    </label>
                    {isMissedWeekSelected && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMissedWeekSelected(false);
                          setPaymentOption('full_due');
                          setEntryAmount(weeklyDue);
                        }}
                        className="text-[10px] text-rose-600 font-semibold hover:underline cursor-pointer"
                      >
                        Cancel Missed Week
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700 font-bold text-sm">
                      ₹
                    </div>
                    <input
                      id="sheet-entry-amount"
                      type="number"
                      min="0"
                      step="any"
                      disabled={isMissedWeekSelected}
                      value={isMissedWeekSelected ? 0 : entryAmount}
                      onChange={(e) => {
                        setIsMissedWeekSelected(false);
                        setEntryAmount(e.target.value === '' ? '' : Number(e.target.value));
                      }}
                      placeholder={isWeekly ? String(weeklyDue) : '2000'}
                      required={!isMissedWeekSelected}
                      className={`w-full pl-8 pr-3 py-2.5 rounded-xl text-sm sm:text-base font-bold focus:outline-none focus:ring-2 ${
                        isMissedWeekSelected
                          ? 'bg-rose-50 border border-rose-300 text-rose-700'
                          : 'bg-white border border-slate-300 text-slate-900 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Add Entry Button */}
                <div className="sm:col-span-3">
                  <button
                    id="btn-sheet-record-payment"
                    type="submit"
                    disabled={!isMissedWeekSelected && (!entryAmount || Number(entryAmount) <= 0)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      isMissedWeekSelected
                        ? 'bg-rose-600 hover:bg-rose-700 active:scale-98 text-white shadow-rose-600/20'
                        : entryAmount && Number(entryAmount) > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-600/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isMissedWeekSelected ? 'Record Missed' : 'Record'}</span>
                  </button>
                </div>
              </div>

              {isMissedWeekSelected && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Recorded as skipped week. Remaining balance stays intact at {formatINR(details.remainingPrincipal)}.</span>
                </div>
              )}

              {/* Payment Mode Selection */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Mode:</span>
                  {(['cash', 'gpay', 'phonepe', 'bank'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setEntryMode(mode)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer uppercase border ${
                        entryMode === mode
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-slate-500 italic">
                  Note: Share via WhatsApp button available after saving
                </div>
              </div>
            </form>
          </div>

          {/* PASSBOOK LIST VIEW OF ALL TRANSACTIONS WITH CHRONOLOGICAL RUNNING BALANCE */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Passbook Payment Records ({displayTransactions.length} entries)</span>
              </h4>
              <span className="text-[11px] text-slate-600">
                Total Paid: <strong className="text-emerald-700">{formatINR(details.totalPaid)}</strong>
              </span>
            </div>

            {displayTransactions.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                <p>No payments recorded in passbook sheet yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select an option or fill the amount above to record your first entry.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayTransactions.map((tx, idx) => {
                  const isMissed = tx.isMissedWeek || tx.amountPaid === 0;
                  const isPartial = isWeekly && !isMissed && tx.amountPaid < weeklyDue;

                  return (
                    <div
                      key={tx.id}
                      id={`sheet-tx-row-${tx.id}`}
                      className={`p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs transition-colors border shadow-2xs ${
                        isMissed
                          ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                          : isPartial
                          ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Entry Index Badge */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isMissed 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          #{displayTransactions.length - idx}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-base sm:text-lg ${isMissed ? 'text-rose-700' : 'text-slate-900'}`}>
                              {formatINR(tx.amountPaid)}
                            </span>
                            <span className="font-mono text-slate-600 text-xs bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              {tx.date}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {tx.paymentMode || 'cash'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                            {isMissed ? (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[10px]">
                                Missed Week
                              </span>
                            ) : isPartial ? (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold text-[10px]">
                                Partial (₹{tx.amountPaid} / ₹{weeklyDue})
                              </span>
                            ) : isWeekly ? (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                                Full Due
                              </span>
                            ) : null}

                            <span className="text-slate-500">
                              Remaining: <strong className="text-amber-800">{formatINR(tx.balanceAfter)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Manual WhatsApp Receipt Button */}
                        <button
                          type="button"
                          onClick={() => handleShareTxReceipt(tx)}
                          title="Share WhatsApp Receipt"
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>Receipt</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(customer.id, tx.id)}
                          title="Delete Entry"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE CUSTOMER MODAL OVERLAY */}
      {confirmDeleteCustomer && (
        <div 
          id="detail-confirm-delete-modal"
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
                ⚠️ Warning: Are you sure you want to permanently delete {customer.name}? All payment records and ledger history ({customer.transactions?.length || 0} entries) for this customer will be removed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-detail-delete"
                onClick={() => setConfirmDeleteCustomer(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-detail-delete"
                onClick={() => {
                  onDeleteCustomer(customer.id);
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

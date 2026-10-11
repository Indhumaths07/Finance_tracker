import React, { useState } from 'react';
import { Eye, Phone, PlusCircle, Calendar, MapPin, Filter, RotateCcw, AlertCircle, ArrowRight, Pencil, Trash2, AlertTriangle, X } from 'lucide-react';
import { Customer, LoanType } from '../types';
import { formatINR, formatVattiLabel, getCustomerBalanceDetails, isSameVillage } from '../utils/financeCalculations';

interface CustomerListProps {
  customers: Customer[];
  allCustomers?: Customer[];
  viewMode: 'laptop' | 'phone';
  selectedVillage?: string;
  selectedLoanType?: 'all' | LoanType;
  searchQuery?: string;
  onResetFilters?: () => void;
  onResetLoanType?: () => void;
  onResetSearch?: () => void;
  onSelectVillage?: (village: string) => void;
  onViewDetails: (customer: Customer) => void;
  onAddPayment: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onOpenAddCustomer: () => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  allCustomers = [],
  viewMode,
  selectedVillage = 'all',
  selectedLoanType = 'all',
  searchQuery = '',
  onResetFilters,
  onResetLoanType,
  onResetSearch,
  onSelectVillage,
  onViewDetails,
  onAddPayment,
  onEditCustomer,
  onDeleteCustomer,
  onOpenAddCustomer,
}) => {
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  if (customers.length === 0) {
    const isFilteredByVillage = selectedVillage !== 'all';
    const isFilteredByLoanType = selectedLoanType !== 'all';
    const hasSearchQuery = Boolean(searchQuery.trim());
    const hasAnyFilter = isFilteredByVillage || isFilteredByLoanType || hasSearchQuery;

    // Check if there are customers in this village across all records (case-insensitive & whitespace tolerant)
    const normSelectedVillage = selectedVillage.trim().toLowerCase();
    const customersInThisVillage = isFilteredByVillage
      ? allCustomers.filter((c) => isSameVillage(c.village, selectedVillage))
      : [];

    // Check if any customer has a partial match or similar village name (e.g. "Mettur Dam" vs "Mettur")
    const partiallyMatchingCustomers = isFilteredByVillage && customersInThisVillage.length === 0
      ? allCustomers.filter((c) => {
          const cv = (c.village || '').toLowerCase();
          return cv.includes(normSelectedVillage) || normSelectedVillage.includes(cv);
        })
      : [];

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-center my-6 shadow-xs max-w-2xl mx-auto">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-2xs">
          {isFilteredByVillage ? <MapPin className="w-7 h-7" /> : <Calendar className="w-7 h-7" />}
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900">
          {isFilteredByVillage ? (
            <span>No Customers Found in <span className="text-emerald-700 font-extrabold">{selectedVillage}</span></span>
          ) : (
            'No Customers Found'
          )}
        </h3>

        {/* Diagnostic explanation if customers exist in this village but hidden by another filter */}
        {customersInThisVillage.length > 0 ? (
          <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{customersInThisVillage.length} customer(s) found in {selectedVillage}, but hidden by active filters:</span>
            </div>
            <p className="text-slate-600 text-[11px] pl-5">
              {isFilteredByLoanType && `• Loan Type is set to "${selectedLoanType === 'weekly' ? 'Weekly' : 'Monthly'}" (this customer may have a different loan type). `}
              {hasSearchQuery && `• Search query "${searchQuery}" does not match this customer.`}
            </p>
            <div className="pl-5 pt-1">
              <button
                type="button"
                onClick={() => {
                  onResetLoanType?.();
                  onResetSearch?.();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span>Show All Loans in {selectedVillage}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : partiallyMatchingCustomers.length > 0 ? (
          /* Suggestion if village name was slightly different */
          <div className="mt-3 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-left text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-800">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Did you mean customers in similar location?</span>
            </div>
            <div className="space-y-1.5 pl-5">
              {partiallyMatchingCustomers.map((pc) => (
                <div key={pc.id} className="flex items-center justify-between py-1 border-b border-blue-100 last:border-0">
                  <span className="font-bold text-slate-900">{pc.name} <span className="font-normal text-slate-500">({pc.village})</span></span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVillage?.(pc.village);
                      onViewDetails(pc);
                    }}
                    className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Customer</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            {hasAnyFilter
              ? 'No records match your currently selected filters or search query.'
              : 'No customers recorded yet. Add your first customer to get started.'}
          </p>
        )}

        {/* Active Filter Badges */}
        {hasAnyFilter && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {isFilteredByVillage && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                <MapPin className="w-3 h-3 text-emerald-600" />
                Village: <strong>{selectedVillage}</strong>
              </span>
            )}
            {isFilteredByLoanType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                <Calendar className="w-3 h-3 text-emerald-600" />
                Type: <strong>{selectedLoanType === 'weekly' ? 'Weekly' : 'Monthly'}</strong>
              </span>
            )}
            {hasSearchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                Search: <strong>"{searchQuery}"</strong>
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {hasAnyFilter && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Filters ({allCustomers.length} Total)</span>
            </button>
          )}

          <button
            onClick={onOpenAddCustomer}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Customer {isFilteredByVillage ? `in ${selectedVillage}` : ''}</span>
          </button>
        </div>
      </div>
    );
  }

  const showTable = viewMode === 'laptop';

  return (
    <div className="space-y-4">
      {/* 1. LAPTOP TABLE VIEW */}
      {showTable && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-3">Phone</th>
                  <th className="py-3.5 px-3">Village</th>
                  <th className="py-3.5 px-3">Principal Amount</th>
                  <th className="py-3.5 px-3">Start Date</th>
                  <th className="py-3.5 px-3">Rate / Due</th>
                  <th className="py-3.5 px-3">Pending Balance</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.map((c) => {
                  const details = getCustomerBalanceDetails(c);

                  return (
                    <tr
                      key={c.id}
                      id={`customer-row-${c.id}`}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Customer Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => onViewDetails(c)}
                            className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer shrink-0 shadow-2xs"
                            title="Touch circle to view customer details"
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => onViewDetails(c)}
                              className="font-bold text-sm text-slate-900 hover:text-emerald-700 text-left transition-colors cursor-pointer block"
                            >
                              {c.name}
                            </button>
                            <span className="text-[10px] text-slate-500 capitalize">
                              {c.loanType === 'weekly' ? 'Weekly Loan' : 'Monthly Loan'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-3">
                        <a
                          href={`tel:${c.phone}`}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-mono text-xs transition-colors"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          {c.phone}
                        </a>
                      </td>

                      {/* Village */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-[11px] font-medium">
                          <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                          {c.village}
                        </span>
                      </td>

                      {/* Principal Amount */}
                      <td className="py-3.5 px-3 font-semibold text-slate-900">
                        {formatINR(c.principalAmount)}
                      </td>

                      {/* Start Date */}
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                        {c.startDate}
                      </td>

                      {/* Rate / Due */}
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-indigo-700">
                          {formatVattiLabel(c)}
                        </span>
                      </td>

                      {/* Pending Principal / Balance */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-black text-amber-800 text-sm">
                            {formatINR(details.remainingPrincipal)}
                          </span>
                          {c.loanType === 'weekly' && details.missedWeeksCount > 0 && (
                            <span className="text-[10px] text-rose-600 font-semibold">
                              {details.missedWeeksCount} wks skipped
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            id={`btn-edit-customer-${c.id}`}
                            onClick={() => onEditCustomer(c)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-bold transition-all flex items-center gap-1 text-xs cursor-pointer border border-amber-200"
                            title="Edit Customer Data"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-600" />
                            <span>Edit</span>
                          </button>

                          <button
                            id={`btn-view-details-${c.id}`}
                            onClick={() => onViewDetails(c)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all flex items-center gap-1 text-xs cursor-pointer border border-slate-200"
                            title="View Customer Details & Passbook"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Details</span>
                          </button>

                          <button
                            id={`btn-add-payment-${c.id}`}
                            onClick={() => onAddPayment(c)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold transition-all flex items-center gap-1 text-xs cursor-pointer shadow-2xs"
                          >
                            <span>Pay</span>
                          </button>

                          <button
                            id={`btn-delete-customer-${c.id}`}
                            onClick={() => setCustomerToDelete(c)}
                            className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-all flex items-center gap-1 text-xs cursor-pointer border border-rose-200"
                            title="Delete Customer / கஸ்டமரை நீக்கு"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span className="hidden xl:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PHONE CARD VIEW */}
      {!showTable && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {customers.map((c) => {
            const details = getCustomerBalanceDetails(c);

            return (
              <div
                key={c.id}
                id={`customer-card-${c.id}`}
                className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Top Row: Touchable Name Circle, Village, Phone */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Touchable Customer Name Circle */}
                    <button
                      type="button"
                      onClick={() => onViewDetails(c)}
                      className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-base hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer shrink-0 shadow-2xs"
                      title="Touch circle to view customer details"
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </button>

                    <div>
                      <button
                        type="button"
                        onClick={() => onViewDetails(c)}
                        className="font-bold text-base text-slate-900 hover:text-emerald-700 text-left transition-colors cursor-pointer block leading-tight"
                      >
                        {c.name}
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          {c.village}
                        </span>
                        <span className="text-slate-300">•</span>
                        <a
                          href={`tel:${c.phone}`}
                          className="text-[11px] font-mono text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          {c.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                      {c.loanType === 'weekly' ? 'Weekly' : 'Monthly'}
                    </span>
                    <button
                      type="button"
                      id={`btn-phone-quick-edit-${c.id}`}
                      onClick={() => onEditCustomer(c)}
                      className="p-1 rounded-lg text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                      title="Edit Customer Data"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                    <button
                      type="button"
                      id={`btn-phone-quick-delete-${c.id}`}
                      onClick={() => setCustomerToDelete(c)}
                      className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete Customer / கஸ்டமரை நீக்கு"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                </div>

                {/* 3 Balanced Summary Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold">Given</span>
                    <span className="font-bold text-slate-900 block mt-0.5 truncate">
                      {formatINR(c.principalAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-indigo-600 block font-semibold">
                      {c.loanType === 'weekly' ? 'Weekly Due' : 'Rate'}
                    </span>
                    <span className="font-bold text-indigo-700 block mt-0.5 truncate">
                      {formatVattiLabel(c)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-amber-800 block font-bold">Balance</span>
                    <span className="font-black text-amber-900 block mt-0.5 truncate">
                      {formatINR(details.remainingPrincipal)}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    id={`btn-phone-view-details-${c.id}`}
                    onClick={() => onViewDetails(c)}
                    className="flex-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Passbook</span>
                  </button>

                  <button
                    id={`btn-phone-edit-${c.id}`}
                    onClick={() => onEditCustomer(c)}
                    className="py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-amber-200"
                    title="Edit Customer Data"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    id={`btn-phone-delete-${c.id}`}
                    onClick={() => setCustomerToDelete(c)}
                    className="py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-rose-200"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  </button>

                  <button
                    id={`btn-phone-add-payment-${c.id}`}
                    onClick={() => onAddPayment(c)}
                    className="flex-1 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>+ Pay</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DELETE CUSTOMER CONFIRMATION MODAL */}
      {customerToDelete && (
        <div 
          id="delete-customer-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
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
                <strong className="text-slate-900 text-sm">{customerToDelete.name}</strong>
                <span className="text-slate-500 ml-1">({customerToDelete.village})</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Phone: </span>
                <span className="font-mono text-slate-800">{customerToDelete.phone}</span>
              </div>
              <p className="text-[11px] text-rose-800 pt-1.5 border-t border-rose-200 font-medium leading-relaxed">
                ⚠️ Warning: This will permanently remove this customer and all their transaction/payment history ({customerToDelete.transactions?.length || 0} entries). This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-customer"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-customer"
                onClick={() => {
                  onDeleteCustomer(customerToDelete.id);
                  setCustomerToDelete(null);
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

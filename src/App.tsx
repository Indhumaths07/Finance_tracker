import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Transaction, LoanType } from './types';
import { 
  getStoredCustomers, saveCustomers, clearAllStoredCustomers 
} from './utils/storage';
import { computeDashboardSummary, formatINR } from './utils/financeCalculations';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { VillageTabs } from './components/VillageTabs';
import { CustomerList } from './components/CustomerList';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { AddPaymentModal } from './components/AddPaymentModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { EditCustomerModal } from './components/EditCustomerModal';
import { SettingsModal } from './components/SettingsModal';
import { PlusCircle, TrendingUp, Database } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('brother_finance_is_logged_in') === 'true';
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    return getStoredCustomers();
  });

  // View Mode: Phone View or Laptop View option
  const [viewMode, setViewMode] = useState<'laptop' | 'phone'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'phone';
    }
    return 'laptop';
  });

  // Filters
  const [selectedVillage, setSelectedVillage] = useState<string>('all');
  const [selectedLoanType, setSelectedLoanType] = useState<'all' | LoanType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  const [paymentCustomerId, setPaymentCustomerId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Synchronize customers to persistent storage whenever they change
  useEffect(() => {
    saveCustomers(customers);
  }, [customers]);

  // Derived selected customer objects
  const customerForDetail = useMemo(() => {
    if (!detailCustomerId) return null;
    return customers.find((c) => c.id === detailCustomerId) || null;
  }, [detailCustomerId, customers]);

  const customerForPayment = useMemo(() => {
    if (!paymentCustomerId) return null;
    return customers.find((c) => c.id === paymentCustomerId) || null;
  }, [paymentCustomerId, customers]);

  const customerForEdit = useMemo(() => {
    if (!editingCustomerId) return null;
    return customers.find((c) => c.id === editingCustomerId) || null;
  }, [editingCustomerId, customers]);

  // Dashboard summary stats (viewed in Settings)
  const summary = useMemo(() => {
    return computeDashboardSummary(customers);
  }, [customers]);

  // Helper for robust case-insensitive and whitespace-tolerant village matching
  const isSameVillage = (v1?: string, v2?: string) => {
    if (!v1 || !v2) return false;
    const clean1 = v1.trim().replace(/\s+/g, ' ').toLowerCase();
    const clean2 = v2.trim().replace(/\s+/g, ' ').toLowerCase();
    return clean1 === clean2;
  };

  // Unique villages for suggestions and grouping (properly title-cased and deduplicated)
  const uniqueVillages = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => {
      if (c.village && c.village.trim()) {
        const key = c.village.trim().replace(/\s+/g, ' ').toLowerCase();
        const display = c.village
          .trim()
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        if (!map.has(key)) {
          map.set(key, display);
        }
      }
    });
    return Array.from(map.values()).sort();
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Village filter (case-insensitive)
      if (selectedVillage !== 'all' && !isSameVillage(c.village, selectedVillage)) {
        return false;
      }
      // Loan type filter (weekly or monthly)
      if (selectedLoanType !== 'all') {
        const cLoanType = c.loanType || 'weekly';
        if (cLoanType !== selectedLoanType) {
          return false;
        }
      }
      // Search query (name, phone, village)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (c.name || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').includes(q);
        const matchVillage = (c.village || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchVillage;
      }
      return true;
    });
  }, [customers, selectedVillage, selectedLoanType, searchQuery]);

  // Intelligent Village Selection: prevents empty screen traps
  const handleSelectVillage = (village: string) => {
    setSelectedVillage(village);

    if (village !== 'all') {
      const villageCustomers = customers.filter((c) => isSameVillage(c.village, village));

      // If the village has customers, check if the currently selected loan type has any matches.
      // If NOT (e.g. user had 'Weekly' selected, but this village customer has 'Monthly' loan),
      // auto-reset loan type to 'all' so the customer is NOT hidden!
      if (selectedLoanType !== 'all' && villageCustomers.length > 0) {
        const hasMatchingLoan = villageCustomers.some(
          (c) => (c.loanType || 'weekly') === selectedLoanType
        );
        if (!hasMatchingLoan) {
          setSelectedLoanType('all');
        }
      }

      // If active search query filters out all customers in this village, auto-clear search
      if (searchQuery.trim() && villageCustomers.length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const hasMatchingSearch = villageCustomers.some(
          (c) =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.phone || '').includes(q) ||
            (c.village || '').toLowerCase().includes(q)
        );
        if (!hasMatchingSearch) {
          setSearchQuery('');
        }
      }
    }
  };

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('brother_finance_is_logged_in');
    setIsLoggedIn(false);
  };

  const handleUpdateCustomer = (updated: Customer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleSaveNewCustomer = (
    data: Omit<Customer, 'id' | 'createdAt' | 'transactions'>
  ) => {
    const newCustomer: Customer = {
      ...data,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString(),
      transactions: [],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  const handleSavePayment = (
    customerId: string,
    txData: Omit<Transaction, 'id' | 'createdAt'>
  ) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const updatedTransactions = [...c.transactions, newTx];
          const isSettled = newTx.balanceAfter === 0;
          return {
            ...c,
            status: isSettled ? 'closed' : c.status,
            transactions: updatedTransactions,
          };
        }
        return c;
      })
    );
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    setDetailCustomerId(null);
    setEditingCustomerId(null);
    setPaymentCustomerId(null);
  };

  const handleDeleteTransaction = (customerId: string, txId: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            transactions: c.transactions.filter((tx) => tx.id !== txId),
          };
        }
        return c;
      })
    );
  };

  const handleClearAllData = () => {
    clearAllStoredCustomers();
    setCustomers([]);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white pb-20 sm:pb-8">
      {/* Header with Phone/Laptop View Switcher and Settings */}
      <Header
        customers={customers}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onOpenAddCustomer={() => setShowAddCustomer(true)}
        onOpenSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Quick Collection Metric Bar (This Week's Collection) */}
        <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                This Week's Collection
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                {formatINR(summary.thisWeekTotalCollected || 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Outstanding Balance</span>
              <span className="text-sm sm:text-base font-black text-amber-800">
                {formatINR(summary.totalDueAmount)}
              </span>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-300 shadow-2xs"
              title="Open Profit Reports, Business Totals & PC Backup"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Profit & Reports (லாபம் & அசல்)</span>
              <span className="sm:hidden">Reports</span>
            </button>
          </div>
        </div>

        {/* Village Grouping & Search / Filter Tabs */}
        <VillageTabs
          customers={customers}
          selectedVillage={selectedVillage}
          onSelectVillage={handleSelectVillage}
          selectedLoanType={selectedLoanType}
          onSelectLoanType={setSelectedLoanType}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Customer Ledger List */}
        <CustomerList
          customers={filteredCustomers}
          allCustomers={customers}
          viewMode={viewMode}
          selectedVillage={selectedVillage}
          selectedLoanType={selectedLoanType}
          searchQuery={searchQuery}
          onResetFilters={() => {
            setSelectedVillage('all');
            setSelectedLoanType('all');
            setSearchQuery('');
          }}
          onResetLoanType={() => setSelectedLoanType('all')}
          onResetSearch={() => setSearchQuery('')}
          onSelectVillage={handleSelectVillage}
          onViewDetails={(c) => setDetailCustomerId(c.id)}
          onAddPayment={(c) => setPaymentCustomerId(c.id)}
          onEditCustomer={(c) => setEditingCustomerId(c.id)}
          onDeleteCustomer={handleDeleteCustomer}
          onOpenAddCustomer={() => setShowAddCustomer(true)}
        />
      </main>

      {/* Floating Bottom Quick Bar for Mobile Phones */}
      <div className="fixed sm:hidden bottom-0 inset-x-0 bg-white/95 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between z-20 backdrop-blur-md shadow-lg">
        <div className="text-xs text-slate-600 font-bold">
          {customers.length} {customers.length === 1 ? 'Customer' : 'Customers'}
        </div>

        <button
          id="btn-mobile-quick-add"
          onClick={() => setShowAddCustomer(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Modals */}
      {showAddCustomer && (
        <AddCustomerModal
          existingVillages={uniqueVillages}
          onClose={() => setShowAddCustomer(false)}
          onSaveCustomer={handleSaveNewCustomer}
        />
      )}

      {/* Edit Customer Modal */}
      {customerForEdit && (
        <EditCustomerModal
          customer={customerForEdit}
          existingVillages={uniqueVillages}
          onClose={() => setEditingCustomerId(null)}
          onUpdateCustomer={handleUpdateCustomer}
          onDeleteCustomer={handleDeleteCustomer}
        />
      )}

      {/* Settings Modal (with Weekly Profit, Overall Totals & Backup) */}
      {showSettings && (
        <SettingsModal
          customers={customers}
          summary={summary}
          onClose={() => setShowSettings(false)}
          onDataRestored={(restored) => setCustomers(restored)}
          onClearAllData={handleClearAllData}
          onLogout={handleLogout}
        />
      )}

      {/* View Details Modal with Touchable Customer Circle, 3 Stats, and Direct Fill Passbook Sheet */}
      {customerForDetail && (
        <CustomerDetailModal
          customer={customerForDetail}
          existingVillages={uniqueVillages}
          onClose={() => setDetailCustomerId(null)}
          onUpdateCustomer={handleUpdateCustomer}
          onOpenEditCustomer={(c) => setEditingCustomerId(c.id)}
          onSavePayment={handleSavePayment}
          onDeleteCustomer={handleDeleteCustomer}
          onDeleteTransaction={handleDeleteTransaction}
        />
      )}

      {/* Quick Add Payment Modal */}
      {customerForPayment && (
        <AddPaymentModal
          customer={customerForPayment}
          onClose={() => setPaymentCustomerId(null)}
          onSavePayment={handleSavePayment}
        />
      )}
    </div>
  );
}

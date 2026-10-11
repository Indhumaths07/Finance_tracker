import { Customer, DashboardSummary, WeeklyProfitSummary, WeeklyProfitItem } from '../types';

export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.max(0, end.getTime() - start.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateMonthsAndDays(startDateStr: string, endDateStr: string): { months: number; days: number; totalDays: number } {
  const totalDays = calculateDaysBetween(startDateStr, endDateStr);
  const months = Math.floor(totalDays / 30);
  const remainingDays = totalDays % 30;
  return { months, days: remainingDays, totalDays };
}

export function calculateWeeksAndDays(startDateStr: string, endDateStr: string): { weeks: number; days: number; totalDays: number } {
  const totalDays = calculateDaysBetween(startDateStr, endDateStr);
  const weeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;
  return { weeks, days: remainingDays, totalDays };
}

/**
 * Calculates current standing for a customer:
 * - Current principal balance remaining
 * - Total interest paid to date
 * - Total principal paid to date
 * - Total amount paid to date
 * - Interest accrued from last transaction date (or start date) till today
 */
export function getCustomerBalanceDetails(customer: Customer, asOfDateStr: string = new Date().toISOString().split('T')[0]) {
  const transactions = [...(customer.transactions || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let totalPaid = 0;
  let missedWeeksCount = 0;

  transactions.forEach((tx) => {
    const amt = Number(tx.amountPaid || 0);
    totalPaid += amt;
    totalPrincipalPaid += Number(tx.principalPortion || 0);
    totalInterestPaid += Number(tx.interestPortion || 0);
    if (tx.isMissedWeek || amt === 0) {
      missedWeeksCount++;
    }
  });

  // Last date evaluated (either start date or last transaction date)
  let lastCalcDate = customer.startDate;
  if (transactions.length > 0) {
    const lastTx = transactions[transactions.length - 1];
    lastCalcDate = lastTx.date;
  }

  const daysSinceLast = calculateDaysBetween(lastCalcDate, asOfDateStr);
  const totalDaysSinceStart = calculateDaysBetween(customer.startDate, asOfDateStr);

  let remainingPrincipal = 0;
  let estimatedAccruedInterest = 0;
  let totalDueAmount = 0;

  // Weekly loan (Vara Kanakku / Thandal) specific properties
  const isWeekly = customer.loanType === 'weekly';
  const totalWeeks = customer.tenureWeeks || 10;
  // Starting balance written directly by the user, or totalPayableAmount, or principal
  const startingBalance = customer.initialBalance !== undefined 
    ? customer.initialBalance 
    : (isWeekly ? (customer.totalPayableAmount || customer.principalAmount) : customer.principalAmount);

  const weeklyDue = customer.weeklyDueAmount || (startingBalance && totalWeeks ? Math.round(startingBalance / totalWeeks) : 600);
  const targetCollection = startingBalance;
  const totalProfitTarget = Math.max(0, targetCollection - customer.principalAmount);
  const profitRatio = targetCollection > 0 ? (totalProfitTarget / targetCollection) : 0;
  const weeklyRemainingBalance = Math.max(0, targetCollection - totalPaid);
  const paidWeeks = weeklyDue > 0 ? Math.floor(totalPaid / weeklyDue) : 0;

  if (isWeekly) {
    // In weekly finance, the customer owes the starting balance minus payments
    remainingPrincipal = weeklyRemainingBalance;
    totalDueAmount = weeklyRemainingBalance;
    estimatedAccruedInterest = 0; // Accrued interest is already built into the weekly target
  } else {
    // Standard monthly loan: starting balance minus payments
    remainingPrincipal = Math.max(0, startingBalance - (totalPrincipalPaid || totalPaid));
    const monthlyRate = customer.interestRate / 100;
    const dailyRate = monthlyRate / 30;
    estimatedAccruedInterest = Math.round(remainingPrincipal * dailyRate * daysSinceLast);
    totalDueAmount = remainingPrincipal + estimatedAccruedInterest;
  }

  return {
    remainingPrincipal,
    totalPrincipalPaid,
    totalInterestPaid,
    totalPaid,
    estimatedAccruedInterest,
    totalDueAmount,
    daysSinceLast,
    totalDaysSinceStart,
    lastCalcDate,
    // Weekly finance specifics
    isWeekly,
    startingBalance,
    targetCollection,
    weeklyDue,
    totalWeeks,
    paidWeeks,
    missedWeeksCount,
    profitRatio,
    weeklyRemainingBalance,
  };
}

export function getChronologicalTransactionsWithRunningBalance(customer: Customer) {
  const transactions = [...(customer.transactions || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const isWeekly = customer.loanType === 'weekly';
  // Starting balance user wrote:
  const startingBalance = customer.initialBalance !== undefined
    ? customer.initialBalance
    : (isWeekly ? (customer.totalPayableAmount || customer.principalAmount) : customer.principalAmount);

  let runningBalance = startingBalance;

  return transactions.map((tx) => {
    const isMissed = tx.isMissedWeek || tx.amountPaid === 0;
    const amtPaid = isMissed ? 0 : Number(tx.amountPaid || 0);

    // Subtract from user starting balance
    runningBalance = Math.max(0, runningBalance - amtPaid);

    return {
      ...tx,
      balanceAfter: runningBalance,
    };
  });
}

export interface WeeklyCollectionFilterResult {
  filterType: 'this_week' | 'last_week' | 'last_4_weeks' | 'custom';
  startDateStr: string;
  endDateStr: string;
  totalCollected: number;
  totalProfit: number;
  totalPrincipal: number;
  collectionsCount: number;
  missedCount: number;
  entries: WeeklyProfitItem[];
  weeklyBreakdown?: {
    weekLabel: string;
    start: string;
    end: string;
    totalCollected: number;
    profit: number;
    count: number;
  }[];
}

export function getFilteredWeeklyCollections(
  customers: Customer[],
  filterType: 'this_week' | 'last_week' | 'last_4_weeks' | 'custom',
  customStart?: string,
  customEnd?: string
): WeeklyCollectionFilterResult {
  const today = new Date();
  
  // Helper to get YYYY-MM-DD
  const toYMD = (d: Date) => d.toISOString().split('T')[0];

  let startStr = '';
  let endStr = toYMD(today);

  // Compute boundaries
  if (filterType === 'this_week') {
    // Current week: last 7 days inclusive of today
    const dStart = new Date(today);
    dStart.setDate(dStart.getDate() - 6);
    startStr = toYMD(dStart);
  } else if (filterType === 'last_week') {
    // Previous week: 7 to 13 days ago
    const dStart = new Date(today);
    dStart.setDate(dStart.getDate() - 13);
    const dEnd = new Date(today);
    dEnd.setDate(dEnd.getDate() - 7);
    startStr = toYMD(dStart);
    endStr = toYMD(dEnd);
  } else if (filterType === 'last_4_weeks') {
    const dStart = new Date(today);
    dStart.setDate(dStart.getDate() - 27);
    startStr = toYMD(dStart);
  } else {
    // Custom
    startStr = customStart || toYMD(new Date(today.getTime() - 7 * 86400000));
    endStr = customEnd || toYMD(today);
  }

  let totalCollected = 0;
  let totalProfit = 0;
  let totalPrincipal = 0;
  let collectionsCount = 0;
  let missedCount = 0;
  const entries: WeeklyProfitItem[] = [];

  customers.forEach((c) => {
    (c.transactions || []).forEach((tx) => {
      if (tx.date >= startStr && tx.date <= endStr) {
        const amt = Number(tx.amountPaid || 0);
        const profit = Number(tx.interestPortion || 0);
        const princ = Number(tx.principalPortion || 0);

        if (tx.isMissedWeek || amt === 0) {
          missedCount++;
        } else {
          totalCollected += amt;
          totalProfit += profit;
          totalPrincipal += princ;
          collectionsCount++;
        }

        entries.push({
          txId: tx.id,
          customerId: c.id,
          customerName: c.name,
          village: c.village,
          date: tx.date,
          amountPaid: amt,
          profit: profit,
          principalReduced: princ,
        });
      }
    });
  });

  // Sort entries by date descending
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // If last_4_weeks, calculate 4 blocks
  let weeklyBreakdown: WeeklyCollectionFilterResult['weeklyBreakdown'] | undefined;
  if (filterType === 'last_4_weeks') {
    weeklyBreakdown = [];
    for (let i = 0; i < 4; i++) {
      const wEnd = new Date(today);
      wEnd.setDate(wEnd.getDate() - i * 7);
      const wStart = new Date(today);
      wStart.setDate(wStart.getDate() - (i * 7 + 6));
      const s = toYMD(wStart);
      const e = toYMD(wEnd);

      let wColl = 0;
      let wProf = 0;
      let wCnt = 0;

      customers.forEach((c) => {
        (c.transactions || []).forEach((tx) => {
          if (tx.date >= s && tx.date <= e && !tx.isMissedWeek && (tx.amountPaid || 0) > 0) {
            wColl += Number(tx.amountPaid || 0);
            wProf += Number(tx.interestPortion || 0);
            wCnt++;
          }
        });
      });

      const label = i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i + 1} Weeks Ago`;
      weeklyBreakdown.push({
        weekLabel: label,
        start: s,
        end: e,
        totalCollected: wColl,
        profit: wProf,
        count: wCnt,
      });
    }
  }

  return {
    filterType,
    startDateStr: startStr,
    endDateStr: endStr,
    totalCollected,
    totalProfit,
    totalPrincipal,
    collectionsCount,
    missedCount,
    entries,
    weeklyBreakdown,
  };
}

export function getWeeklyProfitSummary(customers: Customer[], refDateStr?: string): WeeklyProfitSummary {
  const refDate = refDateStr ? new Date(refDateStr) : new Date();
  
  // Last 7 days boundary
  const sevenDaysAgo = new Date(refDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const refDateStrFormatted = refDate.toISOString().split('T')[0];

  // Month boundary (current YYYY-MM)
  const currentMonthPrefix = refDateStrFormatted.substring(0, 7);

  let thisWeekProfit = 0;
  let thisWeekTotalCollected = 0;
  let thisMonthProfit = 0;
  let thisMonthTotalCollected = 0;
  const weeklyEntries: WeeklyProfitItem[] = [];

  customers.forEach((c) => {
    (c.transactions || []).forEach((tx) => {
      const txProfit = Number(tx.interestPortion || 0);
      const txAmount = Number(tx.amountPaid || 0);

      // Check if within last 7 days
      if (tx.date >= sevenDaysAgoStr && tx.date <= refDateStrFormatted) {
        thisWeekProfit += txProfit;
        thisWeekTotalCollected += txAmount;
        weeklyEntries.push({
          txId: tx.id,
          customerId: c.id,
          customerName: c.name,
          village: c.village,
          date: tx.date,
          amountPaid: txAmount,
          profit: txProfit,
          principalReduced: Number(tx.principalPortion || 0),
        });
      }

      // Check if within this month
      if (tx.date.startsWith(currentMonthPrefix)) {
        thisMonthProfit += txProfit;
        thisMonthTotalCollected += txAmount;
      }
    });
  });

  // Sort weekly entries newest first
  weeklyEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    thisWeekProfit,
    thisWeekTotalCollected,
    thisMonthProfit,
    thisMonthTotalCollected,
    weeklyEntries,
  };
}

export function computeDashboardSummary(customers: Customer[]): DashboardSummary {
  let totalPrincipalLent = 0;
  let totalPrincipalRemaining = 0;
  let totalProfitCollected = 0;
  let totalCollectedOverall = 0;
  let totalDueAmount = 0;
  let activeCustomers = 0;
  let closedCustomers = 0;
  let weeklyCount = 0;
  let monthlyCount = 0;

  let totalTargetWithInterest = 0;
  let totalExpectedProfit = 0;
  let totalProfitEarned = 0;

  let weeklyPrincipalLent = 0;
  let weeklyTargetWithInterest = 0;
  let weeklyExpectedProfit = 0;
  let weeklyCollected = 0;
  let weeklyDueRemaining = 0;

  let monthlyPrincipalLent = 0;
  let monthlyTargetWithInterest = 0;
  let monthlyExpectedProfit = 0;
  let monthlyCollected = 0;
  let monthlyDueRemaining = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  customers.forEach((c) => {
    const principal = Number(c.principalAmount || 0);
    totalPrincipalLent += principal;

    if (c.status === 'active') {
      activeCustomers++;
    } else {
      closedCustomers++;
    }

    const details = getCustomerBalanceDetails(c, todayStr);
    totalPrincipalRemaining += details.remainingPrincipal;
    totalCollectedOverall += details.totalPaid;
    totalDueAmount += details.totalDueAmount;

    let custTargetWithInterest = 0;
    let custProfitTarget = 0;
    let custProfitEarned = 0;

    if (c.loanType === 'weekly') {
      weeklyCount++;
      // Weekly loan: starting balance is total target with interest
      custTargetWithInterest = details.startingBalance;
      custProfitTarget = Math.max(0, custTargetWithInterest - principal);
      
      // Calculate profit earned from transactions based on profit ratio or explicit interestPortion
      c.transactions?.forEach((tx) => {
        const amt = Number(tx.amountPaid || 0);
        if (amt > 0 && !tx.isMissedWeek) {
          if (tx.interestPortion !== undefined && tx.interestPortion > 0) {
            custProfitEarned += Number(tx.interestPortion);
          } else {
            custProfitEarned += Math.round(amt * details.profitRatio);
          }
        }
      });
      // Cap at total profit target
      custProfitEarned = Math.min(custProfitTarget, custProfitEarned);

      weeklyPrincipalLent += principal;
      weeklyTargetWithInterest += custTargetWithInterest;
      weeklyExpectedProfit += custProfitTarget;
      weeklyCollected += details.totalPaid;
      weeklyDueRemaining += details.remainingPrincipal;
    } else {
      monthlyCount++;
      // Monthly loan
      if (c.initialBalance !== undefined && c.initialBalance > principal) {
        custTargetWithInterest = c.initialBalance;
        custProfitTarget = c.initialBalance - principal;
      } else {
        custProfitTarget = details.totalInterestPaid + details.estimatedAccruedInterest;
        custTargetWithInterest = principal + custProfitTarget;
      }

      custProfitEarned = details.totalInterestPaid;

      monthlyPrincipalLent += principal;
      monthlyTargetWithInterest += custTargetWithInterest;
      monthlyExpectedProfit += custProfitTarget;
      monthlyCollected += details.totalPaid;
      monthlyDueRemaining += details.remainingPrincipal;
    }

    totalTargetWithInterest += custTargetWithInterest;
    totalExpectedProfit += custProfitTarget;
    totalProfitEarned += custProfitEarned;
    totalProfitCollected += custProfitEarned;
  });

  const totalPendingProfit = Math.max(0, totalExpectedProfit - totalProfitEarned);
  const weeklySummary = getWeeklyProfitSummary(customers, todayStr);

  return {
    totalPrincipalLent,
    totalPrincipalRemaining,
    totalProfitCollected,
    totalCollectedOverall,
    totalDueAmount,
    totalCustomers: customers.length,
    activeCustomers,
    closedCustomers,
    weeklyCount,
    monthlyCount,
    thisWeekTotalCollected: weeklySummary.thisWeekTotalCollected,
    thisMonthTotalCollected: weeklySummary.thisMonthTotalCollected,
    thisWeekProfit: weeklySummary.thisWeekProfit,
    thisMonthProfit: weeklySummary.thisMonthProfit,
    totalTargetWithInterest,
    totalExpectedProfit,
    totalProfitEarned,
    totalPendingProfit,
    weeklyPrincipalLent,
    weeklyTargetWithInterest,
    weeklyExpectedProfit,
    weeklyCollected,
    weeklyDueRemaining,
    monthlyPrincipalLent,
    monthlyTargetWithInterest,
    monthlyExpectedProfit,
    monthlyCollected,
    monthlyDueRemaining,
  };
}

export function formatINR(val: number): string {
  if (isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatVattiLabel(customer: Customer): string {
  if (customer.loanType === 'weekly') {
    const weeklyDue = customer.weeklyDueAmount || (customer.totalPayableAmount && customer.tenureWeeks ? Math.round(customer.totalPayableAmount / customer.tenureWeeks) : 600);
    return `₹${weeklyDue} / wk`;
  }
  return `${customer.interestRate}%`;
}

export function generateWhatsAppReceipt(
  customer: Customer,
  tx: { amountPaid: number; interestPortion?: number; principalPortion?: number; balanceAfter: number; date: string; isMissedWeek?: boolean }
): string {
  const isWeekly = customer.loanType === 'weekly';
  const isMissed = tx.isMissedWeek || tx.amountPaid === 0;

  const paymentText = isMissed 
    ? `Status: *Missed Week (₹0)*`
    : `Amount Received: *${formatINR(tx.amountPaid)}*`;

  const dueInfo = isWeekly && customer.weeklyDueAmount 
    ? `Weekly Due: *₹${customer.weeklyDueAmount} / week*\n` 
    : '';

  const msg = 
`*Palaniyandavar Finance - Payment Receipt*
Customer: *${customer.name}*
Village: *${customer.village}*
Date: *${tx.date}*
${dueInfo}${paymentText}
Remaining Balance: *${formatINR(tx.balanceAfter)}*
------------------------
Thank you!
Palaniyandavar Finance`;

  return encodeURIComponent(msg);
}

/**
 * Normalizes a village name by trimming, removing excessive whitespace,
 * and converting to lowercase for robust comparisons.
 */
export function normalizeVillageName(village?: string): string {
  if (!village) return '';
  return village
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Robust check if two village strings refer to the same location,
 * tolerating extra spaces, case differences, and optional punctuation.
 */
export function isSameVillage(v1?: string, v2?: string): boolean {
  if (!v1 || !v2) return false;
  const n1 = normalizeVillageName(v1);
  const n2 = normalizeVillageName(v2);
  if (!n1 || !n2) return false;
  return n1 === n2;
}


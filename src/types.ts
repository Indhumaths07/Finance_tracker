export type LoanType = 'weekly' | 'monthly';

export type InterestUnit = 
  | 'percent_per_month'      // e.g. 2% or 3% per month (₹2 per ₹100/month)
  | 'rupees_per_hundred'     // e.g. 2 or 3 rupees per month per 100
  | 'fixed_weekly_amount'    // e.g. Rs 100 per week
  | 'weekly_percentage';     // e.g. 1% per week

export interface Transaction {
  id: string;
  date: string;              // YYYY-MM-DD
  amountPaid: number;        // Total amount received (0 if missed week)
  interestPortion: number;   // Amount counted as interest / profit
  principalPortion: number;  // Amount deducted from principal
  balanceAfter: number;      // Remaining balance
  paymentMode: 'cash' | 'gpay' | 'phonepe' | 'bank';
  isMissedWeek?: boolean;    // Marked as missed week / no payment
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;              // Customer name
  phone: string;             // Phone number
  village: string;           // Village or town
  address?: string;          // Address
  principalAmount: number;   // Principal amount lent / given (e.g. 5000)
  totalPayableAmount?: number; // Total to collect (e.g. 6000)
  initialBalance?: number;   // User-written starting balance (e.g. 6000)
  weeklyDueAmount?: number;  // Weekly installment due (e.g. 600)
  tenureWeeks?: number;      // Total weeks (e.g. 10 weeks)
  startDate: string;         // Loan date (YYYY-MM-DD)
  loanType: LoanType;        // Weekly loan or monthly loan
  interestRate: number;      // For monthly: %; for weekly: total profit or weekly due
  interestUnit: InterestUnit;
  transactions: Transaction[];
  status: 'active' | 'closed';
  createdAt: string;
  notes?: string;
}

export interface WeeklyProfitItem {
  txId: string;
  customerId: string;
  customerName: string;
  village: string;
  date: string;
  amountPaid: number;
  profit?: number;
  principalReduced?: number;
}

export interface WeeklyProfitSummary {
  thisWeekProfit?: number;
  thisWeekTotalCollected: number;
  thisMonthProfit?: number;
  thisMonthTotalCollected: number;
  weeklyEntries: WeeklyProfitItem[];
}

export interface DashboardSummary {
  totalPrincipalLent: number;
  totalPrincipalRemaining: number;
  totalProfitCollected?: number; // Deprecated
  totalCollectedOverall: number; // Total collections received to date
  totalDueAmount: number;        // Remaining balance to collect
  totalCustomers: number;
  activeCustomers: number;
  closedCustomers: number;
  weeklyCount: number;
  monthlyCount: number;
  thisWeekTotalCollected: number; // Collection this week
  thisMonthTotalCollected: number; // Collection this month
  thisWeekProfit?: number;
  thisMonthProfit?: number;
  // User requested overall business & profit metrics
  totalTargetWithInterest: number; // Total amount with interest (வட்டியுடன் கூடிய மொத்த வசூல் இலக்கு)
  totalExpectedProfit: number;    // Expected total profit (எதிர்பார்க்கப்படும் மொத்த லாபம்)
  totalProfitEarned: number;      // Profit already collected to date (இதுவரை வசூலான லாபம்)
  totalPendingProfit: number;     // Remaining profit to collect (இனி வசூலாக வேண்டிய லாபம்)
  weeklyPrincipalLent: number;
  weeklyTargetWithInterest: number;
  weeklyExpectedProfit: number;
  weeklyCollected: number;
  weeklyDueRemaining: number;
  monthlyPrincipalLent: number;
  monthlyTargetWithInterest: number;
  monthlyExpectedProfit: number;
  monthlyCollected: number;
  monthlyDueRemaining: number;
}

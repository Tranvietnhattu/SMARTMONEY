
export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME'
}

export enum Category {
  FOOD = 'Ăn uống',
  SHOPPING = 'Mua sắm',
  BILLS = 'Hóa đơn',
  ENTERTAINMENT = 'Giải trí',
  OTHER = 'Khác',
  SALARY = 'Lương',
  BONUS = 'Thưởng'
}

// Map để biết hạng mục nào là thiết yếu
export const IS_ESSENTIAL: Record<string, boolean> = {
  [Category.FOOD]: true,
  [Category.BILLS]: true,
  [Category.OTHER]: false,
  [Category.SHOPPING]: false,
  [Category.ENTERTAINMENT]: false
};

export enum PaymentSource {
  CASH = 'Tiền mặt',
  EWALLET = 'Ví điện tử',
  BANK = 'Ngân hàng'
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: Category;
  date: string; // ISO string
  source: PaymentSource;
  note: string;
}

export interface FinancialScore {
  score: number;
  label: string;
  color: string;
  suggestion: string;
}

export interface CycleReport {
  summary: string;
  stats: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    financialScore: number;
    bestCategory: string;
    worstCategory: string;
    abnormalDays: string[];
  };
  comparison: string;
  behavioralInsight: string;
  recommendation: string;
}

export interface ArchivedCycle {
  cycleId: string;
  data: Transaction[];
  closedAt: string;
  report?: CycleReport;
}

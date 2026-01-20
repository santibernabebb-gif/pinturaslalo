
export interface BudgetLine {
  description: string;
  units?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface BudgetData {
  budgetNumber: string;
  client: string;
  date: string;
  lines: BudgetLine[];
  subtotal: number;
  iva: number;
  total: number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  client: string;
  total: number;
  data: BudgetData;
}

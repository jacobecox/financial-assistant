// Database types matching the Supabase schema

export interface Paycheck {
  id: string;
  user_id: string;
  amount: number;
  pay_date: string; // ISO date string
  next_pay_date: string; // ISO date string
  created_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number; // day of month (1–31)
  recurring: boolean;
  active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  date: string; // ISO date string
  category: string;
  created_at: string;
}

// API request/response shapes

export interface PaycheckInput {
  amount: number;
  pay_date: string;
  next_pay_date: string;
}

export interface BillInput {
  name: string;
  amount: number;
  due_day: number;
  recurring?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// AI tool result types

export interface UpcomingBillsResult {
  bills: Array<{
    name: string;
    amount: number;
    due_day: number;
  }>;
  total: number;
}

export interface SavingsSuggestionResult {
  suggested_transfer: number;
  remaining_discretionary: number;
  total_bills: number;
  paycheck_amount: number;
}

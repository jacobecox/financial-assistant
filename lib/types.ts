import type { Frequency } from "./pay-schedule";

export type { Frequency };

export interface Income {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  date: string; // ISO date
  notes: string | null;
  created_at: string;
}

export interface IncomeInput {
  amount: number;
  source: string;
  date: string;
  notes?: string;
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

export interface PayScheduleInput {
  name: string;
  amount: number;
  frequency: Frequency;
  anchor_date: string; // ISO date — required for biweekly; reference for others
  pay_day_1?: number;  // required for monthly + twice_monthly
  pay_day_2?: number;  // required for twice_monthly
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

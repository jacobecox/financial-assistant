import type { Frequency } from "./pay-schedule";
import type { BillFrequency } from "./bills";

export type { Frequency, BillFrequency };

export interface Income {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  date: string;
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
  category: string | null;
  frequency: BillFrequency;
  due_day: number | null;
  anchor_date: string | null;
  recurring: boolean;
  active: boolean;
  created_at: string;
}

export interface BillInput {
  name: string;
  amount: number;
  category?: string;
  frequency: BillFrequency;
  due_day?: number;
  anchor_date?: string;
  recurring?: boolean;
}

export interface PayScheduleInput {
  name: string;
  amount: number;
  frequency: Frequency;
  anchor_date: string;
  pay_day_1?: number;
  pay_day_2?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UpcomingBillsResult {
  bills: Array<{
    name: string;
    amount: number;
    next_due: string;
    frequency: BillFrequency;
  }>;
  total: number;
}

export interface SavingsSuggestionResult {
  suggested_transfer: number;
  remaining_discretionary: number;
  total_bills: number;
  paycheck_amount: number;
}

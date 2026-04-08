import type Anthropic from "@anthropic-ai/sdk";
import sql from "./db";
import { computePayDates, type PaySchedule } from "./pay-schedule";
import type { UpcomingBillsResult, SavingsSuggestionResult } from "./types";

// Tool definitions passed to Claude
export const financialTools: Anthropic.Tool[] = [
  {
    name: "get_upcoming_bills",
    description:
      "Returns bills due before a given date. Use this to answer questions about upcoming bill obligations.",
    input_schema: {
      type: "object" as const,
      properties: {
        before_date: {
          type: "string",
          description: "ISO date string — return bills due on or before this date",
        },
      },
      required: ["before_date"],
    },
  },
  {
    name: "get_current_paycheck",
    description:
      "Returns the current paycheck amount plus the current and next pay dates derived from the user's pay schedule.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_expenses_summary",
    description: "Returns the total of all active recurring monthly bills.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_income_summary",
    description:
      "Returns income entries for a date range. Use this to answer questions about how much has been earned.",
    input_schema: {
      type: "object" as const,
      properties: {
        since: {
          type: "string",
          description: "ISO date string — return income entries on or after this date",
        },
      },
      required: ["since"],
    },
  },
  {
    name: "suggest_savings_transfer",
    description:
      "Calculates a realistic savings transfer amount after accounting for all bills due before the next paycheck.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// Tool executor — receives tool name + input, returns result string
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string
): Promise<string> {
  switch (toolName) {
    case "get_upcoming_bills": {
      const beforeDate = toolInput.before_date as string;
      const bills = await sql<{ name: string; amount: number; due_day: number }[]>`
        SELECT name, amount, due_day FROM bills
        WHERE user_id = ${userId} AND active = true
      `;

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const cutoff = new Date(beforeDate);

      const upcoming = bills.filter((b: { name: string; amount: number; due_day: number }) => {
        const dueDate = new Date(currentYear, currentMonth - 1, b.due_day);
        return dueDate <= cutoff;
      });

      const result: UpcomingBillsResult = {
        bills: upcoming,
        total: upcoming.reduce((sum: number, b: { amount: number }) => sum + Number(b.amount), 0),
      };
      return JSON.stringify(result);
    }

    case "get_current_paycheck": {
      const schedules = await sql<PaySchedule[]>`
        SELECT * FROM pay_schedules WHERE user_id = ${userId} ORDER BY created_at ASC
      `;
      if (!schedules.length) return JSON.stringify({ error: "No pay schedules set up" });

      const result = schedules.map((s) => ({
        name: s.name,
        amount: Number(s.amount),
        frequency: s.frequency,
        ...computePayDates(s),
      }));
      const totalScheduled = result.reduce((sum, s) => sum + s.amount, 0);
      return JSON.stringify({ schedules: result, total_scheduled: totalScheduled });
    }

    case "get_expenses_summary": {
      const bills = await sql<{ name: string; amount: number }[]>`
        SELECT name, amount FROM bills
        WHERE user_id = ${userId} AND active = true AND recurring = true
      `;
      const total = bills.reduce((sum: number, b: { name: string; amount: number }) => sum + Number(b.amount), 0);
      return JSON.stringify({ bills, total });
    }

    case "get_income_summary": {
      const since = toolInput.since as string;
      const entries = await sql<{ source: string; amount: number; date: string; notes: string | null }[]>`
        SELECT source, amount, date, notes FROM income
        WHERE user_id = ${userId} AND date >= ${since}::date
        ORDER BY date DESC
      `;
      const total = entries.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);
      return JSON.stringify({ entries, total });
    }

    case "suggest_savings_transfer": {
      const schedules = await sql<PaySchedule[]>`
        SELECT * FROM pay_schedules WHERE user_id = ${userId} ORDER BY created_at ASC
      `;
      if (!schedules.length) return JSON.stringify({ error: "No pay schedules set up" });

      // Use the earliest current_pay_date across all schedules as period start
      const computedSchedules = schedules.map((s) => ({ ...s, ...computePayDates(s) }));
      const earliestCurrentPayDate = computedSchedules
        .map((s) => s.current_pay_date)
        .sort()[0];
      // Use the latest next_pay_date for the bill cutoff
      const latestNextPayDate = computedSchedules
        .map((s) => s.next_pay_date)
        .filter(Boolean)
        .sort()
        .at(-1);
      if (!latestNextPayDate) return JSON.stringify({ error: "No next pay date available" });

      const totalScheduled = schedules.reduce((sum, s) => sum + Number(s.amount), 0);

      const bills = await sql<{ amount: number; due_day: number }[]>`
        SELECT amount, due_day FROM bills
        WHERE user_id = ${userId} AND active = true
      `;

      // Use actual income this period if recorded; fall back to sum of scheduled amounts
      const incomeEntries = await sql<{ amount: number }[]>`
        SELECT amount FROM income
        WHERE user_id = ${userId} AND date >= ${earliestCurrentPayDate}::date
      `;
      const actualIncome = incomeEntries.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);
      const availableIncome = actualIncome > 0 ? actualIncome : totalScheduled;

      const next_pay_date = latestNextPayDate;

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const cutoff = new Date(next_pay_date);

      const dueBills = bills.filter((b: { amount: number; due_day: number }) => {
        const dueDate = new Date(currentYear, currentMonth - 1, b.due_day);
        return dueDate <= cutoff;
      });

      const totalBills = dueBills.reduce((sum: number, b: { amount: number }) => sum + Number(b.amount), 0);
      const afterBills = availableIncome - totalBills;
      const suggestedTransfer = Math.max(0, Math.floor(afterBills * 0.5));

      const result: SavingsSuggestionResult = {
        suggested_transfer: suggestedTransfer,
        remaining_discretionary: afterBills - suggestedTransfer,
        total_bills: totalBills,
        paycheck_amount: availableIncome,
      };
      return JSON.stringify(result);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

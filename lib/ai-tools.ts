import type Anthropic from "@anthropic-ai/sdk";
import sql from "./db";
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
    description: "Returns the most recently entered paycheck amount and dates.",
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
      const [paycheck] = await sql`
        SELECT amount, pay_date, next_pay_date FROM paychecks
        WHERE user_id = ${userId}
        ORDER BY pay_date DESC
        LIMIT 1
      `;
      return JSON.stringify(paycheck ?? { error: "No paycheck found" });
    }

    case "get_expenses_summary": {
      const bills = await sql<{ name: string; amount: number }[]>`
        SELECT name, amount FROM bills
        WHERE user_id = ${userId} AND active = true AND recurring = true
      `;
      const total = bills.reduce((sum: number, b: { name: string; amount: number }) => sum + Number(b.amount), 0);
      return JSON.stringify({ bills, total });
    }

    case "suggest_savings_transfer": {
      const [paycheck] = await sql<{ amount: number; next_pay_date: string }[]>`
        SELECT amount, next_pay_date FROM paychecks
        WHERE user_id = ${userId}
        ORDER BY pay_date DESC
        LIMIT 1
      `;

      if (!paycheck) return JSON.stringify({ error: "No paycheck found" });

      const bills = await sql<{ amount: number; due_day: number }[]>`
        SELECT amount, due_day FROM bills
        WHERE user_id = ${userId} AND active = true
      `;

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const cutoff = new Date(paycheck.next_pay_date);

      const dueBills = bills.filter((b: { amount: number; due_day: number }) => {
        const dueDate = new Date(currentYear, currentMonth - 1, b.due_day);
        return dueDate <= cutoff;
      });

      const totalBills = dueBills.reduce((sum: number, b: { amount: number }) => sum + Number(b.amount), 0);
      const afterBills = Number(paycheck.amount) - totalBills;
      const suggestedTransfer = Math.max(0, Math.floor(afterBills * 0.5));

      const result: SavingsSuggestionResult = {
        suggested_transfer: suggestedTransfer,
        remaining_discretionary: afterBills - suggestedTransfer,
        total_bills: totalBills,
        paycheck_amount: Number(paycheck.amount),
      };
      return JSON.stringify(result);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

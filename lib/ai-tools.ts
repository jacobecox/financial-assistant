import type Anthropic from "@anthropic-ai/sdk";
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
      "Returns the most recently entered paycheck amount and dates.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_expenses_summary",
    description:
      "Returns the total of all active recurring monthly bills.",
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
  userId: string,
  serviceClient: ReturnType<typeof import("./supabase").createServiceClient>
): Promise<string> {
  switch (toolName) {
    case "get_upcoming_bills": {
      const beforeDate = toolInput.before_date as string;
      const { data: bills } = await serviceClient
        .from("bills")
        .select("name, amount, due_day")
        .eq("user_id", userId)
        .eq("active", true);

      if (!bills) return JSON.stringify({ bills: [], total: 0 });

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const cutoff = new Date(beforeDate);

      const upcoming = bills.filter((b) => {
        const dueDate = new Date(currentYear, currentMonth - 1, b.due_day);
        return dueDate <= cutoff;
      });

      const result: UpcomingBillsResult = {
        bills: upcoming,
        total: upcoming.reduce((sum, b) => sum + b.amount, 0),
      };
      return JSON.stringify(result);
    }

    case "get_current_paycheck": {
      const { data } = await serviceClient
        .from("paychecks")
        .select("amount, pay_date, next_pay_date")
        .eq("user_id", userId)
        .order("pay_date", { ascending: false })
        .limit(1)
        .single();

      return JSON.stringify(data ?? { error: "No paycheck found" });
    }

    case "get_expenses_summary": {
      const { data: bills } = await serviceClient
        .from("bills")
        .select("name, amount")
        .eq("user_id", userId)
        .eq("active", true)
        .eq("recurring", true);

      const total = bills?.reduce((sum, b) => sum + b.amount, 0) ?? 0;
      return JSON.stringify({ bills, total });
    }

    case "suggest_savings_transfer": {
      const { data: paycheck } = await serviceClient
        .from("paychecks")
        .select("amount, next_pay_date")
        .eq("user_id", userId)
        .order("pay_date", { ascending: false })
        .limit(1)
        .single();

      if (!paycheck) return JSON.stringify({ error: "No paycheck found" });

      const { data: bills } = await serviceClient
        .from("bills")
        .select("amount, due_day")
        .eq("user_id", userId)
        .eq("active", true);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const cutoff = new Date(paycheck.next_pay_date);

      const dueBills = (bills ?? []).filter((b) => {
        const dueDate = new Date(currentYear, currentMonth - 1, b.due_day);
        return dueDate <= cutoff;
      });

      const totalBills = dueBills.reduce((sum, b) => sum + b.amount, 0);
      const afterBills = paycheck.amount - totalBills;
      const suggestedTransfer = Math.max(0, Math.floor(afterBills * 0.5));

      const result: SavingsSuggestionResult = {
        suggested_transfer: suggestedTransfer,
        remaining_discretionary: afterBills - suggestedTransfer,
        total_bills: totalBills,
        paycheck_amount: paycheck.amount,
      };
      return JSON.stringify(result);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

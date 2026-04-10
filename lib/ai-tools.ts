import type Anthropic from "@anthropic-ai/sdk";
import sql from "./db";
import { computePayDates, type PaySchedule } from "./pay-schedule";
import { computeNextDueDate, billOccurrencesInWindow, monthlyEquivalent, type BillDateInfo } from "./bills";
import type { UpcomingBillsResult } from "./types";

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
      "Returns each pay schedule with its current and next pay dates, and amounts.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_expenses_summary",
    description: "Returns the total of all active recurring monthly bills with their monthly equivalents.",
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
    name: "get_buffer_summary",
    description:
      "Returns the user's discretionary buffer items — amounts reserved each paycheck as a buffer before savings. Always fetch this when calculating max savings per paycheck.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_planned_expenses",
    description:
      "Returns one-time planned expenses for a given month. Use this when calculating savings for a specific month.",
    input_schema: {
      type: "object" as const,
      properties: {
        year:  { type: "number", description: "4-digit year" },
        month: { type: "number", description: "Month as 1-12" },
      },
      required: ["year", "month"],
    },
  },
  {
    name: "suggest_savings_transfer",
    description:
      "Calculates the maximum savings transfer per paycheck. For each paycheck: income - bills_due_in_window - buffer_for_this_paycheck - planned_expenses = max_savings. Returns a breakdown per paycheck.",
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
  householdId: string  // scoped to household, not individual user
): Promise<string> {
  switch (toolName) {
    case "get_upcoming_bills": {
      const beforeDate = toolInput.before_date as string;
      const cutoff = new Date(beforeDate);
      const bills = (await sql`
        SELECT name, amount, frequency, due_day, due_day_2, anchor_date FROM bills
        WHERE household_id = ${householdId} AND active = true
      `) as unknown as (BillDateInfo & { name: string })[];

      const upcoming = bills
        .map((b) => ({ ...b, next_due: computeNextDueDate(b) }))
        .filter((b) => b.next_due !== null && new Date(b.next_due) <= cutoff);

      const result: UpcomingBillsResult = {
        bills: upcoming.map((b) => ({
          name: b.name,
          amount: Number(b.amount),
          frequency: b.frequency,
          next_due: b.next_due!,
        })),
        total: upcoming.reduce((sum, b) => sum + Number(b.amount), 0),
      };
      return JSON.stringify(result);
    }

    case "get_current_paycheck": {
      const schedules = (await sql`
        SELECT * FROM pay_schedules WHERE household_id = ${householdId} ORDER BY created_at ASC
      `) as unknown as PaySchedule[];
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
      const bills = (await sql`
        SELECT name, amount, frequency, due_day, due_day_2, anchor_date FROM bills
        WHERE household_id = ${householdId} AND active = true AND recurring = true
      `) as unknown as (BillDateInfo & { name: string })[];
      const total = bills.reduce((sum: number, b: BillDateInfo) => sum + monthlyEquivalent(b), 0);
      return JSON.stringify({
        bills: bills.map((b) => ({ name: b.name, amount: Number(b.amount), frequency: b.frequency, monthly_equivalent: monthlyEquivalent(b) })),
        total,
      });
    }

    case "get_income_summary": {
      const since = toolInput.since as string;
      const entries = (await sql`
        SELECT source, amount, date, notes FROM income
        WHERE household_id = ${householdId} AND date >= ${since}::date
        ORDER BY date DESC
      `) as unknown as { source: string; amount: number; date: string; notes: string | null }[];
      const total = entries.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);
      return JSON.stringify({ entries, total });
    }

    case "get_buffer_summary": {
      const items = (await sql`
        SELECT name, amount, frequency FROM discretionary_items
        WHERE household_id = ${householdId} AND active = true
        ORDER BY created_at ASC
      `) as unknown as { name: string; amount: number; frequency: string }[];
      const total = items.reduce((sum, d) => sum + Number(d.amount), 0);
      return JSON.stringify({
        items: items.map((d) => ({ name: d.name, amount: Number(d.amount), frequency: d.frequency })),
        total_buffer: total,
        note: "These are the amounts the user keeps as a buffer each paycheck cycle. Subtract these from each paycheck before calculating max savings.",
      });
    }

    case "get_planned_expenses": {
      const year  = toolInput.year  as number;
      const month = toolInput.month as number; // 1-indexed
      const rows = (await sql`
        SELECT name, amount, planned_date, notes FROM planned_expenses
        WHERE household_id = ${householdId}
          AND active = true
          AND EXTRACT(year  FROM planned_date) = ${year}
          AND EXTRACT(month FROM planned_date) = ${month}
        ORDER BY planned_date ASC
      `) as unknown as { name: string; amount: number; planned_date: string; notes: string | null }[];
      const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
      return JSON.stringify({ expenses: rows, total_planned: total });
    }

    case "suggest_savings_transfer": {
      const schedules = (await sql`
        SELECT * FROM pay_schedules WHERE household_id = ${householdId} ORDER BY created_at ASC
      `) as unknown as PaySchedule[];
      if (!schedules.length) return JSON.stringify({ error: "No pay schedules set up" });

      const allBills = (await sql`
        SELECT name, amount, frequency, due_day, due_day_2, anchor_date FROM bills
        WHERE household_id = ${householdId} AND active = true
      `) as unknown as (BillDateInfo & { name: string })[];

      const bufferItems = (await sql`
        SELECT name, amount FROM discretionary_items WHERE household_id = ${householdId} AND active = true
      `) as unknown as { name: string; amount: number }[];
      const totalBuffer = bufferItems.reduce((sum, d) => sum + Number(d.amount), 0);

      const now = new Date();
      const plannedRows = (await sql`
        SELECT name, amount, planned_date FROM planned_expenses
        WHERE household_id = ${householdId} AND active = true
          AND EXTRACT(year  FROM planned_date) = ${now.getFullYear()}
          AND EXTRACT(month FROM planned_date) = ${now.getMonth() + 1}
      `) as unknown as { name: string; amount: number; planned_date: string }[];
      const totalPlanned = plannedRows.reduce((sum, r) => sum + Number(r.amount), 0);

      // Expand each schedule into individual paycheck instances for this month
      const y = now.getFullYear();
      const m = now.getMonth(); // 0-indexed
      const monthStart = new Date(y, m, 1);
      const monthEnd   = new Date(y, m + 1, 0);

      const instances: { scheduleName: string; amount: number; payDate: Date; nextPayDate: Date }[] = [];

      for (const s of schedules) {
        const amt = Number(s.amount);

        if (s.frequency === "twice_monthly") {
          const d1 = s.pay_day_1!;
          const d2 = s.pay_day_2!;
          const date1 = new Date(y, m, d1);
          const date2 = new Date(y, m, d2);
          instances.push({ scheduleName: s.name, amount: amt, payDate: date1, nextPayDate: date2 });
          instances.push({ scheduleName: s.name, amount: amt, payDate: date2, nextPayDate: new Date(y, m + 1, d1) });
        } else if (s.frequency === "monthly") {
          const day = s.pay_day_1!;
          instances.push({ scheduleName: s.name, amount: amt, payDate: new Date(y, m, day), nextPayDate: new Date(y, m + 1, day) });
        } else if (s.frequency === "biweekly") {
          const anchorMs = new Date(String(s.anchor_date).slice(0, 10) + "T00:00:00").getTime();
          const intervalMs = 14 * 24 * 60 * 60 * 1000;
          // Fast-forward anchor to first pay date on or after month start
          const periods = Math.ceil((monthStart.getTime() - anchorMs) / intervalMs);
          let cur = anchorMs + Math.max(0, periods) * intervalMs;
          // Step back one if we overshot
          if (cur > monthStart.getTime()) cur -= intervalMs;
          // Collect all pay dates within the month
          while (cur <= monthEnd.getTime()) {
            if (cur >= monthStart.getTime()) {
              instances.push({ scheduleName: s.name, amount: amt, payDate: new Date(cur), nextPayDate: new Date(cur + intervalMs) });
            }
            cur += intervalMs;
          }
        } else if (s.frequency === "once") {
          const d = new Date(String(s.anchor_date).slice(0, 10) + "T00:00:00");
          if (d >= monthStart && d <= monthEnd) {
            instances.push({ scheduleName: s.name, amount: amt, payDate: d, nextPayDate: monthEnd });
          }
        }
      }

      instances.sort((a, b) => a.payDate.getTime() - b.payDate.getTime());

      // For each instance, find ALL bill occurrences in its window [payDate, nextPayDate)
      const paychecks = instances.map((inst) => {
        const dueBills = allBills.flatMap((b) => {
          const occurrences = billOccurrencesInWindow(b, inst.payDate, inst.nextPayDate);
          return occurrences.map((date) => ({
            name: b.name,
            amount: Number(b.amount),
            due: date.toISOString().split("T")[0],
          }));
        });

        const billsTotal = dueBills.reduce((sum, b) => sum + b.amount, 0);
        const maxSavings = Math.max(0, inst.amount - billsTotal - totalBuffer);

        return {
          name: inst.scheduleName,
          pay_date: inst.payDate.toISOString().split("T")[0],
          next_pay_date: inst.nextPayDate.toISOString().split("T")[0],
          paycheck_amount: inst.amount,
          bills_due_in_window: dueBills,
          bills_total: billsTotal,
          buffer_reserved: totalBuffer,
          max_savings: maxSavings,
          calculation: `$${inst.amount} - $${billsTotal} bills - $${totalBuffer} buffer = $${maxSavings}`,
        };
      });

      return JSON.stringify({
        paychecks,
        planned_expenses_this_month: plannedRows.map((r) => ({ name: r.name, amount: Number(r.amount), date: r.planned_date })),
        total_planned: totalPlanned,
        note: "max_savings = paycheck_amount - bills_due_in_window - buffer_reserved. Planned expenses shown for context — factor them into the paycheck(s) closest to their due date.",
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

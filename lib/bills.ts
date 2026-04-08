export type BillFrequency =
  | "weekly"
  | "biweekly"
  | "semi_monthly"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual";

export interface BillDateInfo {
  frequency: BillFrequency;
  due_day: number | null;    // day of month — used by monthly and semi_monthly (first day)
  due_day_2: number | null;  // second day of month — used by semi_monthly only
  anchor_date: string | null; // known past due date — used by all non-monthly/semi_monthly
  amount: number;
}

/** Human-readable label for a frequency */
export function frequencyLabel(f: BillFrequency): string {
  switch (f) {
    case "weekly":       return "Weekly";
    case "biweekly":     return "Every 2 weeks";
    case "semi_monthly": return "Twice a month";
    case "monthly":      return "Monthly";
    case "quarterly":    return "Quarterly";
    case "semi_annual":  return "Twice a year";
    case "annual":       return "Annually";
  }
}

/**
 * Convert any bill amount to its monthly equivalent for budget totals.
 * e.g. a $1,200/year bill → $100/month
 */
export function monthlyEquivalent(bill: BillDateInfo): number {
  const a = Number(bill.amount);
  switch (bill.frequency) {
    case "weekly":       return (a * 52) / 12;
    case "biweekly":     return (a * 26) / 12;
    case "semi_monthly": return a * 2;
    case "monthly":      return a;
    case "quarterly":    return a / 3;
    case "semi_annual":  return a / 6;
    case "annual":       return a / 12;
  }
}

/**
 * Returns the next due date on or after today as an ISO string.
 * Returns null if required fields are missing.
 */
export function computeNextDueDate(
  bill: BillDateInfo,
  today: Date = new Date()
): string | null {
  const { frequency, due_day, due_day_2, anchor_date } = bill;

  // ── Semi-monthly: two fixed days per month ────────────────────────────────
  if (frequency === "semi_monthly") {
    if (!due_day) return null;
    const second = due_day_2 ?? (due_day <= 15 ? due_day + 15 : due_day - 15);
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    const days = [due_day, second].sort((a, b) => a - b);
    // Return the first day this month that hasn't passed yet
    for (const day of days) {
      if (d <= day) return iso(new Date(y, m, day));
    }
    // Both passed — return first day next month
    return iso(new Date(y, m + 1, days[0]));
  }

  // ── Monthly: simple day-of-month ──────────────────────────────────────────
  if (frequency === "monthly") {
    if (!due_day) return null;
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    if (d <= due_day) return iso(new Date(y, m, due_day));
    return iso(new Date(y, m + 1, due_day));
  }

  // ── All others: interval from anchor date ─────────────────────────────────
  if (!anchor_date) return null;
  // anchor_date may be a Date object (direct DB query) or a string (via JSON API)
  const anchor = anchor_date instanceof Date
    ? new Date(anchor_date.toISOString().slice(0, 10) + "T00:00:00")
    : new Date(String(anchor_date).slice(0, 10) + "T00:00:00");

  let next = new Date(anchor);
  while (next < today) {
    next = addInterval(next, frequency);
  }
  return iso(next);
}

/** Advance a date by one billing interval */
function addInterval(date: Date, frequency: BillFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "semi_annual":
      d.setMonth(d.getMonth() + 6);
      break;
    case "annual":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

function iso(d: Date): string {
  return d.toISOString().split("T")[0];
}

export type Frequency = "once" | "monthly" | "twice_monthly" | "biweekly";

export interface PaySchedule {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  anchor_date: string; // ISO date — reference point for biweekly; ignored for monthly/twice_monthly
  pay_day_1: number | null; // day of month: used by monthly + twice_monthly
  pay_day_2: number | null; // second day of month: twice_monthly only (e.g. 15 when pay_day_1 = 1)
  created_at: string;
  updated_at: string;
}

export interface ComputedPayDates {
  current_pay_date: string; // most recent pay date on or before today
  next_pay_date: string | null; // next upcoming pay date (null for 'once')
}

/**
 * Given a pay schedule and an optional reference date (defaults to today),
 * returns the current pay date and the next upcoming pay date.
 */
export function computePayDates(
  schedule: PaySchedule,
  today: Date = new Date()
): ComputedPayDates {
  const { frequency, anchor_date, pay_day_1, pay_day_2 } = schedule;
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed
  const d = today.getDate();

  switch (frequency) {
    case "once": {
      return { current_pay_date: anchor_date, next_pay_date: null };
    }

    case "monthly": {
      const day = pay_day_1!;
      if (d >= day) {
        // Today is on or after this month's pay day — current is this month
        return {
          current_pay_date: isoDate(y, m, day),
          next_pay_date: isoDate(y, m + 1, day),
        };
      } else {
        // Today is before this month's pay day — current is last month
        return {
          current_pay_date: isoDate(y, m - 1, day),
          next_pay_date: isoDate(y, m, day),
        };
      }
    }

    case "twice_monthly": {
      const day1 = pay_day_1!; // e.g. 1
      const day2 = pay_day_2!; // e.g. 15

      if (d >= day2) {
        // Past the 2nd pay date — current is day2 this month, next is day1 next month
        return {
          current_pay_date: isoDate(y, m, day2),
          next_pay_date: isoDate(y, m + 1, day1),
        };
      } else if (d >= day1) {
        // Between day1 and day2 — current is day1 this month, next is day2 this month
        return {
          current_pay_date: isoDate(y, m, day1),
          next_pay_date: isoDate(y, m, day2),
        };
      } else {
        // Before day1 — current is day2 last month, next is day1 this month
        return {
          current_pay_date: isoDate(y, m - 1, day2),
          next_pay_date: isoDate(y, m, day1),
        };
      }
    }

    case "biweekly": {
      const anchorMs = new Date(anchor_date).getTime();
      const todayMs = today.getTime();
      const intervalMs = 14 * 24 * 60 * 60 * 1000;
      // How many complete 14-day periods since the anchor pay date
      const periods = Math.floor((todayMs - anchorMs) / intervalMs);
      return {
        current_pay_date: msToIso(anchorMs + periods * intervalMs),
        next_pay_date: msToIso(anchorMs + (periods + 1) * intervalMs),
      };
    }
  }
}

// Helpers

/** Build an ISO date string from year, 0-indexed month, and day.
 *  JavaScript's Date constructor normalises overflow/underflow automatically
 *  (e.g. month -1 rolls back to December of the prior year). */
function isoDate(year: number, month0: number, day: number): string {
  return msToIso(new Date(year, month0, day).getTime());
}

function msToIso(ms: number): string {
  return new Date(ms).toISOString().split("T")[0];
}

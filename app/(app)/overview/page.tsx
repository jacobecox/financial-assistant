"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { monthlyEquivalent } from "@/lib/bills";
import { useMonth } from "@/components/MonthContext";
import type { Bill, DiscretionaryItem } from "@/lib/types";
import type { BillFrequency } from "@/lib/bills";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaySchedule {
  id: string;
  name: string;
  amount: number;
  frequency: "twice_monthly" | "monthly" | "biweekly" | "once";
  end_date: string | null;
  anchor_date: string | null;
}

interface PlannedExpense {
  id: string;
  name: string;
  amount: number;
  planned_date: string;
  notes: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const card = "rounded-xl bg-slate-800 ring-1 ring-white/5 p-4";

function fmt$(n: number) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function monthlyFromSchedule(s: PaySchedule): number {
  const a = Number(s.amount);
  switch (s.frequency) {
    case "twice_monthly": return a * 2;
    case "monthly":       return a;
    case "biweekly":      return (a * 26) / 12;
    case "once":          return a;
  }
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent, dim, href,
}: {
  label: string; value: string; sub?: string; accent: string; dim?: boolean; href?: string;
}) {
  const inner = (
    <div className={`${card} border-l-2 ${accent} space-y-1 ${href ? "hover:ring-white/10 transition-all" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${dim ? "text-slate-400" : "text-slate-50"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}

// ─── Breakdown bar ────────────────────────────────────────────────────────────

function BreakdownBar({
  income, bills, planned, discretionary,
}: {
  income: number; bills: number; planned: number; discretionary: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (income <= 0) return null;

  const savings   = Math.max(0, income - bills - planned - discretionary);
  const overspent = bills + planned + discretionary > income;

  const billsPct    = Math.min(100, (bills        / income) * 100);
  const plannedPct  = Math.min(100 - billsPct, (planned     / income) * 100);
  const discPct     = Math.min(100 - billsPct - plannedPct, (discretionary / income) * 100);
  const savingsPct  = (savings / income) * 100;

  const t = "transition-all duration-700 ease-out";

  return (
    <div className={card + " space-y-4"}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Monthly Breakdown
      </h2>

      <div className="flex h-5 overflow-hidden rounded-full bg-slate-700/60 gap-px">
        <div className={`${t} bg-rose-500/80 rounded-l-full`}      style={{ width: mounted ? `${billsPct}%`   : "0%" }} />
        <div className={`${t} bg-orange-400/80`}                    style={{ width: mounted ? `${plannedPct}%` : "0%" }} />
        <div className={`${t} bg-violet-500/80`}                    style={{ width: mounted ? `${discPct}%`    : "0%" }} />
        {!overspent && (
          <div className={`${t} bg-emerald-500 rounded-r-full flex-1`} style={{ width: mounted ? `${savingsPct}%` : "0%" }} />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { color: "bg-rose-500/80",    label: "Bills",    value: bills,         pct: billsPct,    textColor: "text-rose-400" },
          { color: "bg-orange-400/80",  label: "Planned",  value: planned,       pct: plannedPct,  textColor: "text-orange-400" },
          { color: "bg-violet-500/80",  label: "Buffer",   value: discretionary, pct: discPct,     textColor: "text-violet-400" },
          { color: "bg-emerald-500",    label: "Savings",  value: savings,       pct: savingsPct,  textColor: "text-emerald-400" },
        ].map(({ color, label, value, pct, textColor }) => (
          <div key={label} className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-sm ${color} shrink-0`} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <p className={`text-base font-bold tabular-nums ${overspent && label !== "Bills" ? "text-slate-500" : textColor}`}>
              {overspent && label !== "Bills" ? "—" : fmt$(value)}
            </p>
            <p className="text-xs text-slate-500">
              {overspent && label !== "Bills" ? "—" : `${pct.toFixed(0)}%`}
            </p>
          </div>
        ))}
      </div>

      {overspent && (
        <p className="text-xs text-rose-400/80">
          Expenses exceed income this month. Review your bills or discretionary items.
        </p>
      )}
    </div>
  );
}

// ─── Upcoming bills helpers ───────────────────────────────────────────────────

function addInterval(date: Date, frequency: BillFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "weekly":      d.setDate(d.getDate() + 7);        break;
    case "biweekly":    d.setDate(d.getDate() + 14);       break;
    case "quarterly":   d.setMonth(d.getMonth() + 3);      break;
    case "semi_annual": d.setMonth(d.getMonth() + 6);      break;
    case "annual":      d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

interface UpcomingBill {
  name: string;
  amount: number;
  date: Date;
  daysUntil: number;
}

function getUpcomingBills(bills: Bill[], days = 14): UpcomingBill[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);

  const results: UpcomingBill[] = [];

  for (const bill of bills.filter((b) => b.active && b.recurring)) {
    // Check today's month and next month to catch bills near month boundaries
    const months = [
      { year: today.getFullYear(), month: today.getMonth() },
      { year: cutoff.getFullYear(), month: cutoff.getMonth() },
    ];
    const seen = new Set<string>();

    for (const { year, month } of months) {
      const monthEnd = new Date(year, month + 1, 0);

      if (bill.frequency === "monthly") {
        if (!bill.due_day) continue;
        const d = new Date(year, month, bill.due_day);
        const key = d.toISOString();
        if (!seen.has(key) && d >= today && d <= cutoff) {
          seen.add(key);
          results.push({ name: bill.name, amount: Number(bill.amount), date: d, daysUntil: Math.round((d.getTime() - today.getTime()) / 86400000) });
        }
      } else if (bill.frequency === "semi_monthly") {
        if (!bill.due_day) continue;
        const days2 = [bill.due_day];
        const d2 = bill.due_day_2 ?? (bill.due_day <= 15 ? bill.due_day + 15 : bill.due_day - 15);
        if (d2 !== bill.due_day) days2.push(d2);
        for (const day of days2) {
          if (day < 1 || day > monthEnd.getDate()) continue;
          const d = new Date(year, month, day);
          const key = d.toISOString();
          if (!seen.has(key) && d >= today && d <= cutoff) {
            seen.add(key);
            results.push({ name: bill.name, amount: Number(bill.amount), date: d, daysUntil: Math.round((d.getTime() - today.getTime()) / 86400000) });
          }
        }
      } else if (bill.anchor_date) {
        let cur = new Date(String(bill.anchor_date).slice(0, 10) + "T00:00:00");
        const monthStart = new Date(year, month, 1);
        while (cur < monthStart) cur = addInterval(cur, bill.frequency);
        while (cur <= monthEnd) {
          const key = cur.toISOString();
          if (!seen.has(key) && cur >= today && cur <= cutoff) {
            seen.add(key);
            results.push({ name: bill.name, amount: Number(bill.amount), date: new Date(cur), daysUntil: Math.round((cur.getTime() - today.getTime()) / 86400000) });
          }
          cur = addInterval(cur, bill.frequency);
        }
      }
    }
  }

  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ─── Upcoming bills widget ────────────────────────────────────────────────────

function UpcomingBills({ bills }: { bills: Bill[] }) {
  const upcoming = getUpcomingBills(bills, 14);

  if (upcoming.length === 0) return null;

  return (
    <div className={card + " space-y-3"}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Upcoming Bills · Next 14 Days</h2>
      <ul className="space-y-2 max-h-52 overflow-y-auto scrollbar-hide">
        {upcoming.map((b, i) => {
          const dateStr = b.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          const urgency = b.daysUntil === 0 ? "text-red-400" : b.daysUntil <= 3 ? "text-orange-400" : "text-slate-400";
          const badge = b.daysUntil === 0 ? "Today" : b.daysUntil === 1 ? "Tomorrow" : `${b.daysUntil}d`;
          return (
            <li key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xs font-semibold tabular-nums w-16 shrink-0 ${urgency}`}>{badge}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{b.name}</p>
                  <p className="text-xs text-slate-500">{dateStr}</p>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-slate-300 shrink-0">{fmt$(b.amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { year, month, monthLabel } = useMonth();

  const [bills, setBills]               = useState<Bill[]>([]);
  const [schedules, setSchedules]       = useState<PaySchedule[]>([]);
  const [discretionary, setDiscretionary] = useState<DiscretionaryItem[]>([]);
  const [planned, setPlanned]           = useState<PlannedExpense[]>([]);
  const [netWorth, setNetWorth]         = useState<number | null>(null);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    Promise.all([
      fetch("/api/bills").then((r) => r.json()),
      fetch("/api/pay-schedule").then((r) => r.json()),
      fetch("/api/discretionary").then((r) => r.json()),
      fetch(`/api/planned-expenses?year=${year}&month=${month}`).then((r) => r.json()),
      fetch("/api/plaid/accounts").then((r) => r.json()).catch(() => ({ accounts: [] })),
    ]).then(([b, s, d, p, plaid]) => {
      setBills(Array.isArray(b) ? b : []);
      setSchedules(Array.isArray(s) ? s : []);
      setDiscretionary(Array.isArray(d) ? d : []);
      setPlanned(Array.isArray(p) ? p : []);
      const accounts: { type: string; current_balance: string | number | null }[] = plaid.accounts ?? [];
      if (accounts.length > 0) {
        const liabilityTypes = ["credit", "loan"];
        const assets = accounts.filter((a) => !liabilityTypes.includes(a.type));
        const liabilities = accounts.filter((a) => liabilityTypes.includes(a.type));
        setNetWorth(
          assets.reduce((s, a) => s + Number(a.current_balance ?? 0), 0) -
          liabilities.reduce((s, a) => s + Number(a.current_balance ?? 0), 0)
        );
      }
      setLoading(false);
    }).catch(() => {
      setFetchError(true);
      setLoading(false);
    });
  }, [year, month]);

  const totalBills = bills
    .filter((b) => b.recurring && b.active)
    .reduce((sum, b) => sum + monthlyEquivalent({
      frequency: b.frequency,
      due_day: b.due_day,
      due_day_2: b.due_day_2,
      anchor_date: b.anchor_date,
      amount: b.amount,
    }), 0);

  const totalPlanned = planned.reduce((sum, p) => sum + Number(p.amount), 0);

  const totalDiscretionary = discretionary.reduce((sum, d) => sum + monthlyEquivalent({
    frequency: d.frequency,
    due_day: null,
    due_day_2: null,
    anchor_date: null,
    amount: d.amount,
  }), 0);

  // Only count schedules active in the selected month
  const activeSchedules = schedules.filter((s) => {
    if (s.frequency === "once") {
      if (!s.anchor_date) return false;
      const d = new Date(String(s.anchor_date).slice(0, 10) + "T00:00:00");
      return d.getFullYear() === year && d.getMonth() === month;
    }
    if (s.end_date) {
      const endDate = new Date(String(s.end_date).slice(0, 10) + "T00:00:00");
      if (endDate < new Date(year, month, 1)) return false;
    }
    return true;
  });

  const expectedMonthly = activeSchedules.reduce((sum, s) => sum + monthlyFromSchedule(s), 0);
  const estSavings      = Math.max(0, expectedMonthly - totalBills - totalPlanned - totalDiscretionary);
  const hasSchedules    = activeSchedules.length > 0;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-800" />
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <p className="text-sm text-rose-400">
        Failed to load your overview. Please refresh the page.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      {netWorth !== null && (
        <Link href="/accounts" className="block group">
          <div className="rounded-xl bg-linear-to-br from-emerald-950/60 to-slate-800 ring-1 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/70 mb-1">Net Worth</p>
            <div className="flex items-end justify-between gap-4">
              <p className="text-5xl font-bold tabular-nums text-slate-50 leading-none">{fmt$(netWorth)}</p>
              <p className="text-sm text-slate-500 group-hover:text-emerald-400 transition-colors pb-0.5 shrink-0">View accounts →</p>
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-3">
        <StatCard
          label="Monthly Income"
          value={hasSchedules ? fmt$(expectedMonthly) : "—"}
          sub={hasSchedules ? undefined : "No pay schedule set up"}
          accent="border-emerald-500/50"
          dim={!hasSchedules}
          href="/income"
        />
        <StatCard
          label="Monthly Bills"
          value={totalBills > 0 ? fmt$(totalBills) : "—"}
          sub={
            totalBills > 0
              ? `${bills.filter((b) => b.recurring && b.active).length} recurring bills`
              : "No bills added yet"
          }
          accent="border-rose-500/50"
          href="/expenses"
        />
        {totalPlanned > 0 && (
          <StatCard
            label={`Planned · ${monthLabel}`}
            value={fmt$(totalPlanned)}
            sub={`${planned.length} one-time expense${planned.length !== 1 ? "s" : ""}`}
            accent="border-orange-400/50"
            href="/expenses"
          />
        )}
        <StatCard
          label="Recommended Savings"
          value={expectedMonthly > 0 ? fmt$(estSavings) : "—"}
          sub={
            expectedMonthly > 0
              ? "After bills, planned expenses & buffer"
              : "Add a pay schedule to see this"
          }
          accent="border-teal-500/50"
          dim={!hasSchedules}
          href="/ask"
        />
      </div>

      <BreakdownBar
        income={expectedMonthly}
        bills={totalBills}
        planned={totalPlanned}
        discretionary={totalDiscretionary}
      />

      <UpcomingBills bills={bills} />

      {!hasSchedules && (
        <p className="text-center text-sm text-slate-500">
          <Link href="/income" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Set up a pay schedule
          </Link>
          {" "}to see your monthly picture.
        </p>
      )}
    </div>
  );
}

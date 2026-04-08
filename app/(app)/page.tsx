"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { monthlyEquivalent } from "@/lib/bills";
import { useMonth } from "@/components/MonthContext";
import type { Bill, DiscretionaryItem } from "@/lib/types";

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
  label, value, sub, accent, dim,
}: {
  label: string; value: string; sub?: string; accent: string; dim?: boolean;
}) {
  return (
    <div className={`${card} border-l-2 ${accent} space-y-1`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${dim ? "text-slate-400" : "text-slate-50"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
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
        <div className={`${t} bg-amber-500/80`}                     style={{ width: mounted ? `${discPct}%`    : "0%" }} />
        {!overspent && (
          <div className={`${t} bg-emerald-500 rounded-r-full flex-1`} style={{ width: mounted ? `${savingsPct}%` : "0%" }} />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { color: "bg-rose-500/80",    label: "Bills",    value: bills,         pct: billsPct,    textColor: "text-rose-400" },
          { color: "bg-orange-400/80",  label: "Planned",  value: planned,       pct: plannedPct,  textColor: "text-orange-400" },
          { color: "bg-amber-500/80",   label: "Buffer",   value: discretionary, pct: discPct,     textColor: "text-amber-400" },
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { year, month, monthLabel } = useMonth();

  const [bills, setBills]               = useState<Bill[]>([]);
  const [schedules, setSchedules]       = useState<PaySchedule[]>([]);
  const [discretionary, setDiscretionary] = useState<DiscretionaryItem[]>([]);
  const [planned, setPlanned]           = useState<PlannedExpense[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/bills").then((r) => r.json()),
      fetch("/api/pay-schedule").then((r) => r.json()),
      fetch("/api/discretionary").then((r) => r.json()),
      fetch(`/api/planned-expenses?year=${year}&month=${month}`).then((r) => r.json()),
    ]).then(([b, s, d, p]) => {
      setBills(Array.isArray(b) ? b : []);
      setSchedules(Array.isArray(s) ? s : []);
      setDiscretionary(Array.isArray(d) ? d : []);
      setPlanned(Array.isArray(p) ? p : []);
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      <div className="grid grid-cols-1 gap-3">
        <StatCard
          label="Monthly Income"
          value={hasSchedules ? fmt$(expectedMonthly) : "—"}
          sub={hasSchedules ? undefined : "No pay schedule set up"}
          accent="border-emerald-500/50"
          dim={!hasSchedules}
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
        />
        {totalPlanned > 0 && (
          <StatCard
            label={`Planned · ${monthLabel}`}
            value={fmt$(totalPlanned)}
            sub={`${planned.length} one-time expense${planned.length !== 1 ? "s" : ""}`}
            accent="border-orange-400/50"
          />
        )}
        <StatCard
          label="Recommended Savings"
          value={expectedMonthly > 0 ? fmt$(estSavings) : "—"}
          sub={
            expectedMonthly > 0
              ? "After bills, planned & buffer"
              : "Add a pay schedule to see this"
          }
          accent="border-teal-500/50"
          dim={!hasSchedules}
        />
      </div>

      <BreakdownBar
        income={expectedMonthly}
        bills={totalBills}
        planned={totalPlanned}
        discretionary={totalDiscretionary}
      />

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

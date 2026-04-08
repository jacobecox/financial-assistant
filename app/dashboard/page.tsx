"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { monthlyEquivalent } from "@/lib/bills";
import type { Bill, DiscretionaryItem } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaySchedule {
  id: string;
  name: string;
  amount: number;
  frequency: "twice_monthly" | "monthly" | "biweekly" | "once";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const card = "rounded-xl bg-slate-800 ring-1 ring-white/5 p-4";

function fmt$(n: number) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function currentMonthLabel() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
      <p className={`text-2xl font-bold tabular-nums ${dim ? "text-slate-400" : "text-slate-50"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Breakdown bar ────────────────────────────────────────────────────────────

function BreakdownBar({
  income,
  bills,
  discretionary,
}: {
  income: number;
  bills: number;
  discretionary: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (income <= 0) return null;

  const savings    = Math.max(0, income - bills - discretionary);
  const overspent  = bills + discretionary > income;

  const billsPct   = Math.min(100, (bills        / income) * 100);
  const discPct    = Math.min(100 - billsPct, (discretionary / income) * 100);
  const savingsPct = (savings / income) * 100;

  const t = "transition-all duration-700 ease-out";

  return (
    <div className={card + " space-y-4"}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Monthly Breakdown
      </h2>

      <div className="flex h-4 overflow-hidden rounded-full bg-slate-700/60 gap-px">
        <div className={`${t} bg-rose-500/80 rounded-l-full`}    style={{ width: mounted ? `${billsPct}%`   : "0%" }} />
        <div className={`${t} bg-amber-500/80`}                   style={{ width: mounted ? `${discPct}%`    : "0%" }} />
        {!overspent && (
          <div className={`${t} bg-emerald-500 rounded-r-full flex-1`} style={{ width: mounted ? `${savingsPct}%` : "0%" }} />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-rose-500/80 shrink-0" />
            <span className="text-xs text-slate-400">Bills</span>
          </div>
          <p className="text-sm font-semibold tabular-nums text-rose-400">{fmt$(bills)}</p>
          <p className="text-xs text-slate-500">{billsPct.toFixed(0)}%</p>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-amber-500/80 shrink-0" />
            <span className="text-xs text-slate-400">Buffer</span>
          </div>
          <p className="text-sm font-semibold tabular-nums text-amber-400">
            {overspent ? "—" : fmt$(discretionary)}
          </p>
          <p className="text-xs text-slate-500">{overspent ? "—" : `${discPct.toFixed(0)}%`}</p>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-emerald-500 shrink-0" />
            <span className="text-xs text-slate-400">Savings</span>
          </div>
          <p className="text-sm font-semibold tabular-nums text-emerald-400">
            {overspent ? "—" : fmt$(savings)}
          </p>
          <p className="text-xs text-slate-500">{overspent ? "—" : `${savingsPct.toFixed(0)}%`}</p>
        </div>
      </div>

      {overspent && (
        <p className="text-xs text-rose-400/80">
          Bills and buffer exceed income this month. Review your bills or discretionary items.
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [bills, setBills]               = useState<Bill[]>([]);
  const [schedules, setSchedules]       = useState<PaySchedule[]>([]);
  const [discretionary, setDiscretionary] = useState<DiscretionaryItem[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/bills").then((r) => r.json()),
      fetch("/api/pay-schedule").then((r) => r.json()),
      fetch("/api/discretionary").then((r) => r.json()),
    ]).then(([b, s, d]) => {
      setBills(Array.isArray(b) ? b : []);
      setSchedules(Array.isArray(s) ? s : []);
      setDiscretionary(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const totalBills = bills
    .filter((b) => b.recurring && b.active)
    .reduce((sum, b) => sum + monthlyEquivalent({
      frequency: b.frequency,
      due_day: b.due_day,
      due_day_2: b.due_day_2,
      anchor_date: b.anchor_date,
      amount: b.amount,
    }), 0);

  const totalDiscretionary = discretionary.reduce((sum, d) => sum + monthlyEquivalent({
    frequency: d.frequency,
    due_day: null,
    due_day_2: null,
    anchor_date: null,
    amount: d.amount,
  }), 0);

  const expectedMonthly = schedules.reduce((sum, s) => sum + monthlyFromSchedule(s), 0);
  const estSavings      = Math.max(0, expectedMonthly - totalBills - totalDiscretionary);
  const hasSchedules    = schedules.length > 0;

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
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-xs text-slate-400 mt-0.5">{currentMonthLabel()}</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <StatCard
          label="Expected Monthly Income"
          value={hasSchedules ? fmt$(expectedMonthly) : "—"}
          sub={
            hasSchedules
              ? `From ${schedules.length} schedule${schedules.length !== 1 ? "s" : ""}`
              : "No pay schedule set up"
          }
          accent="border-emerald-500/50"
          dim={!hasSchedules}
        />
        <StatCard
          label="Monthly Bills"
          value={totalBills > 0 ? fmt$(totalBills) : "—"}
          sub={
            totalBills > 0
              ? `${bills.filter((b) => b.recurring && b.active).length} recurring bills · normalized to /mo`
              : "No bills added yet"
          }
          accent="border-rose-500/50"
        />
        <StatCard
          label="Est. Savings"
          value={expectedMonthly > 0 ? fmt$(estSavings) : "—"}
          sub={
            expectedMonthly > 0
              ? "After bills & discretionary buffer"
              : "Add a pay schedule to see this"
          }
          accent="border-teal-500/50"
          dim={!hasSchedules}
        />
      </div>

      <BreakdownBar
        income={expectedMonthly}
        bills={totalBills}
        discretionary={totalDiscretionary}
      />

      {!hasSchedules && (
        <p className="text-center text-sm text-slate-500">
          <Link href="/dashboard/income" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Set up a pay schedule
          </Link>
          {" "}to see your monthly picture.
        </p>
      )}
    </div>
  );
}

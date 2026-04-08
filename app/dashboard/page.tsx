"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bill {
  id: string;
  name: string;
  amount: number;
  recurring: boolean;
  active: boolean;
}

interface PaySchedule {
  id: string;
  name: string;
  amount: number;
  frequency: "twice_monthly" | "monthly" | "biweekly" | "once";
}

interface IncomeEntry {
  id: string;
  amount: number;
  source: string;
  date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const card = "rounded-xl bg-slate-800 ring-1 ring-white/5 p-4";

function fmt$(n: number) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function currentMonthLabel() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

/** Estimate expected monthly income from schedules */
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
  label,
  value,
  sub,
  accent,
  dim,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string; // tailwind border-l color class
  dim?: boolean;
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
}: {
  income: number;
  bills: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (income <= 0) return null;

  const afterBills  = Math.max(0, income - bills);
  const savings     = Math.floor(afterBills * 0.5);
  const leftover    = afterBills - savings;
  const overspent   = bills > income;

  const billsPct    = Math.min(100, (bills    / income) * 100);
  const savingsPct  = (savings  / income) * 100;
  const leftoverPct = (leftover / income) * 100;

  const transition = "transition-all duration-700 ease-out";

  return (
    <div className={card + " space-y-4"}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Monthly Breakdown
      </h2>

      {/* Bar */}
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-700/60 gap-px">
        <div
          className={`${transition} bg-rose-500/80 rounded-l-full`}
          style={{ width: mounted ? `${billsPct}%` : "0%" }}
        />
        {!overspent && (
          <>
            <div
              className={`${transition} bg-emerald-500`}
              style={{ width: mounted ? `${savingsPct}%` : "0%" }}
            />
            <div
              className={`${transition} bg-teal-500/70 rounded-r-full flex-1`}
              style={{ width: mounted ? `${leftoverPct}%` : "0%" }}
            />
          </>
        )}
      </div>

      {/* Legend */}
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
            <span className="h-2 w-2 rounded-sm bg-emerald-500 shrink-0" />
            <span className="text-xs text-slate-400">Savings</span>
          </div>
          <p className="text-sm font-semibold tabular-nums text-emerald-400">
            {overspent ? "—" : fmt$(savings)}
          </p>
          <p className="text-xs text-slate-500">{overspent ? "—" : `${savingsPct.toFixed(0)}%`}</p>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-teal-500/70 shrink-0" />
            <span className="text-xs text-slate-400">Left Over</span>
          </div>
          <p className="text-sm font-semibold tabular-nums text-teal-400">
            {overspent ? "—" : fmt$(leftover)}
          </p>
          <p className="text-xs text-slate-500">{overspent ? "—" : `${leftoverPct.toFixed(0)}%`}</p>
        </div>
      </div>

      {overspent && (
        <p className="text-xs text-rose-400/80">
          Bills exceed recorded income this month. Add income or review your bills.
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [bills, setBills]         = useState<Bill[]>([]);
  const [schedules, setSchedules] = useState<PaySchedule[]>([]);
  const [entries, setEntries]     = useState<IncomeEntry[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/bills").then((r) => r.json()),
      fetch("/api/pay-schedule").then((r) => r.json()),
      fetch(`/api/income?since=${monthStart()}`).then((r) => r.json()),
    ]).then(([b, s, i]) => {
      setBills(Array.isArray(b) ? b : []);
      setSchedules(Array.isArray(s) ? s : []);
      setEntries(Array.isArray(i) ? i : []);
      setLoading(false);
    });
  }, []);

  const totalBills = bills
    .filter((b) => b.recurring && b.active)
    .reduce((sum, b) => sum + Number(b.amount), 0);

  const recordedIncome = entries.reduce((sum, e) => sum + Number(e.amount), 0);

  const expectedMonthly = schedules.reduce(
    (sum, s) => sum + monthlyFromSchedule(s),
    0
  );

  // Use recorded income when available; fall back to expected for estimates
  const incomeForCalc  = recordedIncome > 0 ? recordedIncome : expectedMonthly;
  const estSavings     = Math.max(0, incomeForCalc - totalBills);
  const hasSchedules   = schedules.length > 0;
  const incomeIsActual = recordedIncome > 0;

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
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-xs text-slate-400 mt-0.5">{currentMonthLabel()}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard
          label="Total Income"
          value={incomeIsActual ? fmt$(recordedIncome) : "—"}
          sub={
            incomeIsActual
              ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"} this month`
              : hasSchedules
              ? `Expected ${fmt$(expectedMonthly)} from ${schedules.length} schedule${schedules.length !== 1 ? "s" : ""}`
              : "No income recorded or scheduled"
          }
          accent="border-emerald-500/50"
          dim={!incomeIsActual}
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
        <StatCard
          label="Est. Savings"
          value={incomeForCalc > 0 ? fmt$(estSavings) : "—"}
          sub={
            incomeForCalc > 0
              ? incomeIsActual
                ? "After bills · 50% of remainder"
                : "Based on scheduled income"
              : "Add income or a pay schedule"
          }
          accent="border-teal-500/50"
          dim={!incomeIsActual}
        />
      </div>

      {/* Breakdown bar */}
      <BreakdownBar income={incomeForCalc} bills={totalBills} />

      {/* Recent income */}
      {entries.length > 0 && (
        <section className={card + " space-y-3"}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Recent Income
            </h2>
            <Link
              href="/dashboard/paycheck"
              className="text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              View all →
            </Link>
          </div>
          <ul className="space-y-1.5">
            {entries.slice(0, 4).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg border-l-2 border-emerald-500/30 bg-slate-900/60 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-100">{e.source}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                    })}
                  </span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-400">{fmt$(Number(e.amount))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Empty state nudges */}
      {!hasSchedules && (
        <p className="text-center text-sm text-slate-500">
          <Link href="/dashboard/paycheck" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Set up a pay schedule
          </Link>
          {" "}to see your monthly picture.
        </p>
      )}
    </div>
  );
}

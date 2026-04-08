"use client";

import { useEffect, useState } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DateInput } from "@/components/DateInput";
import type { Income, Frequency } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayScheduleResponse {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  anchor_date: string;
  pay_day_1: number | null;
  pay_day_2: number | null;
  current_pay_date: string;
  next_pay_date: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];

const inputCls =
  "w-full rounded-lg bg-slate-900 px-3 py-2 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer";
const labelCls = "block text-xs text-slate-400 mb-1";

function formatCurrency(n: number) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function describeSchedule(s: PayScheduleResponse) {
  switch (s.frequency) {
    case "twice_monthly":
      return `${ordinal(s.pay_day_1!)} & ${ordinal(s.pay_day_2!)} monthly`;
    case "monthly":
      return `${ordinal(s.pay_day_1!)} of each month`;
    case "biweekly":
      return "Every 2 weeks";
    case "once":
      return `One-time · ${formatDate(s.anchor_date)}`;
  }
}

// ─── Schedule form (shared for add + edit) ────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  amount: "0.00",
  frequency: "twice_monthly" as Frequency,
  anchor_date: today,
  pay_day_1: "1",
  pay_day_2: "15",
};

function ScheduleForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (form: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }));

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (parseFloat(form.amount) <= 0) return;
    onSave(form);
  }

  const dayInput = (field: "pay_day_1" | "pay_day_2", label: string) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number" min={1} max={31} required
        value={form[field]}
        onChange={(e) => set({ [field]: e.target.value })}
        className={inputCls}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Label</label>
          <input
            type="text" required placeholder="e.g. My Paycheck"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            className={inputCls}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Amount per paycheck</label>
          <CurrencyInput value={form.amount} onChange={(v) => set({ amount: v })} className={inputCls} />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Frequency</label>
          <select
            value={form.frequency}
            onChange={(e) => set({ frequency: e.target.value as Frequency })}
            className={inputCls}
          >
            <option value="twice_monthly">Twice a month (e.g. 1st &amp; 15th)</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Monthly</option>
            <option value="once">One-time</option>
          </select>
        </div>

        {form.frequency === "twice_monthly" && (
          <>{dayInput("pay_day_1", "First pay day")} {dayInput("pay_day_2", "Second pay day")}</>
        )}
        {form.frequency === "monthly" && dayInput("pay_day_1", "Pay day (day of month)")}
        {(form.frequency === "biweekly" || form.frequency === "once") && (
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>
              {form.frequency === "biweekly" ? "Most recent pay date" : "Pay date"}
            </label>
            <DateInput
              value={form.anchor_date}
              onChange={(v) => set({ anchor_date: v })}
              required
              className={inputCls}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit" disabled={saving}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button" onClick={onCancel}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Pay schedule section ─────────────────────────────────────────────────────

function PayScheduleSection({
  schedules,
  onAdded,
  onUpdated,
  onDeleted,
}: {
  schedules: PayScheduleResponse[];
  onAdded: (s: PayScheduleResponse) => void;
  onUpdated: (s: PayScheduleResponse) => void;
  onDeleted: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(
    schedules.length === 0 ? "new" : null
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function formFromSchedule(s: PayScheduleResponse): typeof EMPTY_FORM {
    return {
      name: s.name,
      amount: String(s.amount),
      frequency: s.frequency,
      anchor_date: s.anchor_date ?? today,
      pay_day_1: String(s.pay_day_1 ?? 1),
      pay_day_2: String(s.pay_day_2 ?? 15),
    };
  }

  async function handleSave(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        amount: parseFloat(form.amount),
        frequency: form.frequency,
        anchor_date: form.anchor_date,
      };
      if (form.frequency === "twice_monthly") {
        body.pay_day_1 = parseInt(form.pay_day_1);
        body.pay_day_2 = parseInt(form.pay_day_2);
      } else if (form.frequency === "monthly") {
        body.pay_day_1 = parseInt(form.pay_day_1);
      }

      if (editingId === "new") {
        const res = await fetch("/api/pay-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) { onAdded(await res.json()); setEditingId(null); }
      } else {
        const res = await fetch(`/api/pay-schedule/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) { onUpdated(await res.json()); setEditingId(null); }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/pay-schedule/${id}`, { method: "DELETE" });
      if (res.ok) onDeleted(id);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="rounded-xl bg-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Pay Schedules</h2>
        {editingId !== "new" && (
          <button
            type="button"
            onClick={() => setEditingId("new")}
            className="text-xs text-sky-400 hover:text-sky-300"
          >
            + Add
          </button>
        )}
      </div>

      {/* Existing schedules */}
      {schedules.length > 0 && (
        <ul className="divide-y divide-slate-700">
          {schedules.map((s) => (
            <li key={s.id} className="py-2.5 space-y-2">
              {editingId === s.id ? (
                <ScheduleForm
                  initial={formFromSchedule(s)}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {describeSchedule(s)} · {formatCurrency(s.amount)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Next: {s.next_pay_date ? formatDate(s.next_pay_date) : "—"}
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0 text-xs mt-0.5">
                    <button
                      onClick={() => setEditingId(s.id)}
                      className="text-sky-400 hover:text-sky-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                      className="text-slate-500 hover:text-red-400 disabled:opacity-50"
                    >
                      {deleting === s.id ? "..." : "Remove"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add new form */}
      {editingId === "new" && (
        <ScheduleForm
          initial={EMPTY_FORM}
          onSave={handleSave}
          onCancel={() => setEditingId(schedules.length === 0 ? "new" : null)}
          saving={saving}
        />
      )}

      {schedules.length === 0 && editingId !== "new" && (
        <p className="text-sm text-slate-500">
          No pay schedules yet.{" "}
          <button className="text-sky-400 hover:text-sky-300" onClick={() => setEditingId("new")}>
            Add one
          </button>
        </p>
      )}
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const INCOME_SOURCES = ["Paycheck", "Side Hustle", "Sold Item", "Freelance", "Gift", "Other"];

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<PayScheduleResponse[] | undefined>(undefined);
  const [income, setIncome] = useState<Income[]>([]);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    amount: "0.00",
    source: "Paycheck",
    date: today,
    notes: "",
  });

  // Earliest current_pay_date across all schedules = start of "this period"
  const periodStart = schedules?.length
    ? [...schedules].map((s) => s.current_pay_date).sort()[0]
    : undefined;

  useEffect(() => {
    fetch("/api/pay-schedule")
      .then((r) => r.json())
      .then(setSchedules);
    fetchIncome();
  }, []);

  function fetchIncome(since?: string) {
    const url = since ? `/api/income?since=${since}` : "/api/income";
    fetch(url).then((r) => r.json()).then(setIncome);
  }

  async function handleAddIncome(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (parseFloat(incomeForm.amount) <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(incomeForm.amount),
          source: incomeForm.source,
          date: incomeForm.date,
          notes: incomeForm.notes || undefined,
        }),
      });
      if (res.ok) {
        setShowIncomeForm(false);
        setIncomeForm({ amount: "0.00", source: "Paycheck", date: today, notes: "" });
        fetchIncome(periodStart);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteIncome(id: string) {
    await fetch(`/api/income/${id}`, { method: "DELETE" });
    setIncome((prev) => prev.filter((e) => e.id !== id));
  }

  const periodIncome = periodStart
    ? income.filter((e) => e.date >= periodStart)
    : income;
  const totalIncome = periodIncome.reduce((sum, e) => sum + Number(e.amount), 0);

  // Header period range
  const latestNextPayDate = schedules?.length
    ? [...schedules].map((s) => s.next_pay_date).filter(Boolean).sort().at(-1)
    : undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Paycheck Overview</h1>
          {periodStart && (
            <p className="text-sm text-slate-400 mt-0.5">
              {formatDate(periodStart)}
              {latestNextPayDate && <> → {formatDate(latestNextPayDate)}</>}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowIncomeForm((v) => !v)}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium hover:bg-sky-500 transition-colors"
        >
          + Add Income
        </button>
      </div>

      {/* Pay schedules */}
      {schedules !== undefined && (
        <PayScheduleSection
          schedules={schedules}
          onAdded={(s) => setSchedules((prev) => [...(prev ?? []), s])}
          onUpdated={(s) => setSchedules((prev) => prev?.map((x) => (x.id === s.id ? s : x)))}
          onDeleted={(id) => setSchedules((prev) => prev?.filter((x) => x.id !== id))}
        />
      )}

      {/* Add income form */}
      {showIncomeForm && (
        <form
          onSubmit={handleAddIncome}
          className="rounded-xl bg-slate-800 border border-slate-700 p-4 space-y-3"
        >
          <h2 className="text-sm font-medium text-slate-300">New Income Entry</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Amount</label>
              <CurrencyInput
                value={incomeForm.amount}
                onChange={(v) => setIncomeForm((f) => ({ ...f, amount: v }))}
                className={inputCls}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Date</label>
              <DateInput
                value={incomeForm.date}
                onChange={(v) => setIncomeForm((f) => ({ ...f, date: v }))}
                required
                className={inputCls}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Source</label>
              <div className="flex flex-wrap gap-2">
                {INCOME_SOURCES.map((s) => (
                  <button
                    key={s} type="button"
                    onClick={() => setIncomeForm((f) => ({ ...f, source: s }))}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      incomeForm.source === s
                        ? "bg-sky-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {!INCOME_SOURCES.includes(incomeForm.source) && (
                <input
                  type="text"
                  value={incomeForm.source}
                  onChange={(e) => setIncomeForm((f) => ({ ...f, source: e.target.value }))}
                  className={"mt-2 " + inputCls}
                  placeholder="Custom source..."
                />
              )}
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes (optional)</label>
              <input
                type="text"
                value={incomeForm.notes}
                onChange={(e) => setIncomeForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. April 1st paycheck"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit" disabled={submitting}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button" onClick={() => setShowIncomeForm(false)}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Income this period */}
      <section className="rounded-xl bg-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
            Income This Period
          </h2>
          <span className="text-xl font-bold">{formatCurrency(totalIncome)}</span>
        </div>
        {periodIncome.length === 0 ? (
          <p className="text-slate-500 text-sm">No income recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-700">
            {periodIncome.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{entry.source}</span>
                  {entry.notes && (
                    <span className="text-slate-400 ml-2 text-xs truncate">{entry.notes}</span>
                  )}
                  <span className="text-slate-500 ml-2 text-xs">{formatDate(entry.date)}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="font-medium text-emerald-400">{formatCurrency(Number(entry.amount))}</span>
                  <button
                    onClick={() => handleDeleteIncome(entry.id)}
                    className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bills / Savings / Discretionary */}
      <section className="rounded-xl bg-slate-800 p-4 space-y-2">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Bills Before Next Paycheck
        </h2>
        <p className="text-slate-500 text-sm">Add bills in the Bills tab to see this.</p>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-xl bg-slate-800 p-4 space-y-1">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Suggested Savings</h2>
          <p className="text-2xl font-bold text-emerald-400">—</p>
        </section>
        <section className="rounded-xl bg-slate-800 p-4 space-y-1">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Discretionary</h2>
          <p className="text-2xl font-bold text-sky-400">—</p>
        </section>
      </div>
    </div>
  );
}

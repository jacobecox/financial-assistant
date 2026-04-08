"use client";

import { useEffect, useState } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DateInput } from "@/components/DateInput";
import type { Bill, DiscretionaryItem, Frequency } from "@/lib/types";
import { computeNextDueDate } from "@/lib/bills";

// CurrencyInput and DateInput are used by ScheduleForm below

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

// ─── Design tokens ────────────────────────────────────────────────────────────

const btn = {
  primary:
    "inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
  primarySm:
    "inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-500/25 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
  secondary:
    "inline-flex items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-150 hover:bg-slate-600 hover:text-white active:scale-95",
  ghost:
    "text-xs font-medium text-emerald-400 transition-colors duration-150 hover:text-emerald-300",
  danger:
    "inline-flex items-center justify-center rounded-md bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400 ring-1 ring-inset ring-red-500/25 transition-all duration-150 hover:bg-red-500/25 hover:text-red-300 active:scale-95",
  muted:
    "text-xs text-slate-500 transition-colors duration-150 hover:text-slate-300",
};

const card = "rounded-xl bg-slate-800 ring-1 ring-white/5 p-4";

const inputCls =
  "w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 ring-1 ring-white/5 transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer";

const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];

function fmt$(n: number) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(iso: string) {
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
    case "twice_monthly": return `${ordinal(s.pay_day_1!)} & ${ordinal(s.pay_day_2!)} monthly`;
    case "monthly":       return `${ordinal(s.pay_day_1!)} of each month`;
    case "biweekly":      return "Every 2 weeks";
    case "once":          return `One-time · ${fmtDate(s.anchor_date)}`;
  }
}

// ─── Inline delete confirmation ───────────────────────────────────────────────

function DeleteConfirm({
  id,
  confirmingId,
  onConfirm,
  onRequest,
  onCancel,
  label = "Remove",
}: {
  id: string;
  confirmingId: string | null;
  onConfirm: () => void;
  onRequest: () => void;
  onCancel: () => void;
  label?: string;
}) {
  const active = confirmingId === id;
  return (
    <div className="relative">
      {/* Keep button in layout always so row doesn't shift */}
      <button
        onClick={active ? onCancel : onRequest}
        className={active ? "invisible pointer-events-none " + btn.muted : btn.muted}
      >
        {label}
      </button>

      {active && (
        <div className="absolute bottom-full right-0 z-20 mb-2 flex items-center gap-2 rounded-lg border border-slate-600/70 bg-slate-900 px-3 py-2 shadow-xl shadow-black/50 whitespace-nowrap">
          {/* small caret */}
          <span className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 border-b border-r border-slate-600/70 bg-slate-900" />
          <span className="text-xs font-medium text-slate-300">Delete?</span>
          <button onClick={onConfirm} className={btn.danger}>Confirm</button>
          <button onClick={onCancel} className="text-slate-500 transition-colors hover:text-slate-200 text-sm leading-none">✕</button>
        </div>
      )}
    </div>
  );
}

// ─── Schedule form ────────────────────────────────────────────────────────────

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
          <>{dayInput("pay_day_1", "First pay day")}{dayInput("pay_day_2", "Second pay day")}</>
        )}
        {form.frequency === "monthly" && dayInput("pay_day_1", "Pay day (day of month)")}
        {(form.frequency === "biweekly" || form.frequency === "once") && (
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>
              {form.frequency === "biweekly" ? "Most recent pay date" : "Pay date"}
            </label>
            <DateInput value={form.anchor_date} onChange={(v) => set({ anchor_date: v })} required className={inputCls} />
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className={btn.primary}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className={btn.secondary}>Cancel</button>
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
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

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
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (res.ok) { onAdded(await res.json()); setEditingId(null); }
      } else {
        const res = await fetch(`/api/pay-schedule/${editingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (res.ok) { onUpdated(await res.json()); setEditingId(null); }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/pay-schedule/${id}`, { method: "DELETE" });
    if (res.ok) { onDeleted(id); setConfirmingDelete(null); }
  }

  return (
    <section className={card + " space-y-3"}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Pay Schedules</h2>
        {editingId !== "new" && (
          <button onClick={() => { setEditingId("new"); setConfirmingDelete(null); }} className={btn.ghost}>
            + Add
          </button>
        )}
      </div>

      {schedules.length > 0 && (
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li key={s.id}>
              {editingId === s.id ? (
                <div className="rounded-lg border border-emerald-500/20 bg-slate-900/50 p-3">
                  <ScheduleForm
                    initial={formFromSchedule(s)}
                    onSave={handleSave}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <div className="group flex items-start justify-between rounded-lg border-l-2 border-emerald-600/30 bg-slate-900/60 px-3 py-2.5 transition-colors duration-150 hover:border-emerald-500/60 hover:bg-slate-900">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100">{s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{describeSchedule(s)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Next: {s.next_pay_date ? fmtDate(s.next_pay_date) : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-4">
                    <p className="text-sm font-semibold tabular-nums text-slate-100">{fmt$(s.amount)}</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setEditingId(s.id); setConfirmingDelete(null); }}
                        className={btn.ghost}
                      >
                        Edit
                      </button>
                      <DeleteConfirm
                        id={s.id}
                        confirmingId={confirmingDelete}
                        onRequest={() => setConfirmingDelete(s.id)}
                        onConfirm={() => handleDelete(s.id)}
                        onCancel={() => setConfirmingDelete(null)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editingId === "new" && (
        <div className="rounded-lg border border-emerald-500/20 bg-slate-900/50 p-3">
          <ScheduleForm
            initial={EMPTY_FORM}
            onSave={handleSave}
            onCancel={() => setEditingId(schedules.length === 0 ? "new" : null)}
            saving={saving}
          />
        </div>
      )}

      {schedules.length === 0 && editingId !== "new" && (
        <p className="text-sm text-slate-500">
          No pay schedules yet.{" "}
          <button className={btn.ghost} onClick={() => setEditingId("new")}>Add one</button>
        </p>
      )}
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<PayScheduleResponse[] | undefined>(undefined);
  const [bills, setBills] = useState<Bill[]>([]);
  const [discretionary, setDiscretionary] = useState<DiscretionaryItem[]>([]);

  useEffect(() => {
    fetch("/api/pay-schedule").then((r) => r.json()).then(setSchedules);
    fetch("/api/bills").then((r) => r.json()).then(setBills);
    fetch("/api/discretionary").then((r) => r.json()).then(setDiscretionary);
  }, []);

  const periodStart = schedules?.length
    ? [...schedules].map((s) => s.current_pay_date).sort()[0]
    : undefined;

  const latestNextPayDate = schedules?.length
    ? [...schedules].map((s) => s.next_pay_date).filter(Boolean).sort().at(-1)
    : undefined;

  const totalScheduled = schedules?.reduce((sum, s) => sum + Number(s.amount), 0) ?? 0;

  const dueBills = latestNextPayDate
    ? bills.filter((b) => {
        const next = computeNextDueDate({
          frequency: b.frequency,
          due_day: b.due_day,
          due_day_2: b.due_day_2,
          anchor_date: b.anchor_date,
          amount: b.amount,
        });
        return next !== null && next <= latestNextPayDate;
      })
    : [];

  const totalBills = dueBills.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalDiscretionary = discretionary.reduce((sum, d) => sum + Number(d.amount), 0);
  const suggestedSavings = Math.max(0, totalScheduled - totalBills - totalDiscretionary);
  const leftOver = totalDiscretionary;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Income</h1>
        {periodStart ? (
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
            {fmtDate(periodStart)}{latestNextPayDate && <> → {fmtDate(latestNextPayDate)}</>}
          </p>
        ) : (
          <p className="text-xs text-slate-500 mt-0.5">No pay schedule set up yet</p>
        )}
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

      {/* Bills before next paycheck */}
      <section className={card + " space-y-3"}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Bills Before Next Paycheck
        </h2>

        {!latestNextPayDate ? (
          <p className="text-slate-500 text-sm">Set up a pay schedule to see this.</p>
        ) : dueBills.length === 0 ? (
          <p className="text-slate-500 text-sm">No bills due before {fmtDate(latestNextPayDate)}.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {dueBills.map((b) => {
                const next = computeNextDueDate({ frequency: b.frequency, due_day: b.due_day, due_day_2: b.due_day_2, anchor_date: b.anchor_date, amount: b.amount })!;
                return (
                  <li key={b.id} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                    <div>
                      <span className="text-sm text-slate-100">{b.name}</span>
                      <span className="text-xs text-slate-500 ml-2">due {fmtDate(next)}</span>
                    </div>
                    <span className="tabular-nums text-sm text-slate-200">{fmt$(b.amount)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between pt-1 border-t border-slate-700">
              <span className="text-xs font-medium text-slate-400">Total</span>
              <span className="tabular-nums text-sm font-semibold text-slate-100">{fmt$(totalBills)}</span>
            </div>
          </>
        )}
      </section>

      {/* Discretionary reserves */}
      {discretionary.length > 0 && (
        <section className={card + " space-y-3"}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Discretionary Reserves
          </h2>
          <ul className="space-y-1">
            {discretionary.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                <span className="text-sm text-slate-100">{d.name}</span>
                <span className="tabular-nums text-sm text-slate-200">{fmt$(d.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between pt-1 border-t border-slate-700">
            <span className="text-xs font-medium text-slate-400">Total reserved</span>
            <span className="tabular-nums text-sm font-semibold text-slate-100">{fmt$(totalDiscretionary)}</span>
          </div>
        </section>
      )}

      {/* Savings / Left Over */}
      <div className="grid grid-cols-2 gap-3">
        <section className={card + " space-y-1"}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Suggested Savings</h2>
          <p className="text-2xl font-bold tabular-nums text-emerald-400">
            {totalScheduled > 0 ? fmt$(suggestedSavings) : "—"}
          </p>
          {totalScheduled > 0 && (
            <p className="text-xs text-slate-600">After bills & discretionary buffer</p>
          )}
        </section>
        <section className={card + " space-y-1"}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Buffer</h2>
          <p className="text-2xl font-bold tabular-nums text-teal-400">
            {totalScheduled > 0 ? fmt$(leftOver) : "—"}
          </p>
          {totalScheduled > 0 && (
            <p className="text-xs text-slate-600">Your discretionary reserves</p>
          )}
        </section>
      </div>
    </div>
  );
}

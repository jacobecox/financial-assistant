"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DateInput } from "@/components/DateInput";
import type { Bill, BillInput, DiscretionaryItem, DiscretionaryFrequency } from "@/lib/types";
import type { BillFrequency } from "@/lib/bills";
import { frequencyLabel, computeNextDueDate } from "@/lib/bills";

// ── Design tokens ─────────────────────────────────────────────────────────────

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
};

const card = "rounded-xl bg-slate-800 ring-1 ring-white/5 p-4";

const inputCls =
  "w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 ring-1 ring-white/5 transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/50";

const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";

// ── Constants ─────────────────────────────────────────────────────────────────

const FREQUENCIES: BillFrequency[] = [
  "weekly",
  "biweekly",
  "semi_monthly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
];

function needsAnchorDate(freq: BillFrequency) {
  return freq !== "monthly" && freq !== "semi_monthly";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDueDate(bill: Bill): string {
  const next = computeNextDueDate({
    frequency: bill.frequency,
    due_day: bill.due_day,
    due_day_2: bill.due_day_2,
    anchor_date: bill.anchor_date,
    amount: bill.amount,
  });
  if (!next) return "—";
  return new Date(next + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmt$(n: number): string {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// ── Delete confirmation popup ─────────────────────────────────────────────────

function DeleteConfirm({
  id,
  confirmingId,
  onConfirm,
  onRequest,
  onCancel,
}: {
  id: string;
  confirmingId: string | null;
  onConfirm: () => void;
  onRequest: () => void;
  onCancel: () => void;
}) {
  const active = confirmingId === id;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [active, onCancel]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={active ? onCancel : onRequest}
        className={active ? "invisible pointer-events-none " + btn.danger : btn.danger}
      >
        Delete
      </button>

      {active && (
        <div className="absolute bottom-full right-0 z-20 mb-2 flex items-center gap-2 rounded-lg border border-slate-600/70 bg-slate-900 px-3 py-2 shadow-xl shadow-black/50 whitespace-nowrap">
          <span className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 border-b border-r border-slate-600/70 bg-slate-900" />
          <span className="text-xs font-medium text-slate-300">Delete?</span>
          <button onClick={onConfirm} className={btn.danger}>Confirm</button>
          <button onClick={onCancel} className="text-slate-500 transition-colors hover:text-slate-200 text-sm leading-none">✕</button>
        </div>
      )}
    </div>
  );
}

// ── Bill form (add / edit) ────────────────────────────────────────────────────

interface BillFormProps {
  initial?: Bill;
  onSave: (data: BillInput) => Promise<void>;
  onCancel: () => void;
}

function dayFromPicker(picker: string): number | undefined {
  return picker ? new Date(picker + "T00:00:00").getDate() : undefined;
}

function pickerFromDay(day: number | null | undefined): string {
  return day ? `2025-01-${String(day).padStart(2, "0")}` : "";
}

function BillForm({ initial, onSave, onCancel }: BillFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? Number(initial.amount).toFixed(2) : "0.00");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [frequency, setFrequency] = useState<BillFrequency>(initial?.frequency ?? "monthly");
  // For monthly/semi_monthly: store as date strings so we can use DateInput, extract day on save
  const [dueDatePicker, setDueDatePicker] = useState<string>(pickerFromDay(initial?.due_day));
  const [dueDatePicker2, setDueDatePicker2] = useState<string>(pickerFromDay(initial?.due_day_2));
  const [anchorDate, setAnchorDate] = useState(initial?.anchor_date ?? "");
  const [recurring, setRecurring] = useState(initial?.recurring ?? true);
  const [saving, setSaving] = useState(false);

  const usesDueDays = frequency === "monthly" || frequency === "semi_monthly";

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        amount: parseFloat(amount),
        category: category.trim() || undefined,
        frequency,
        due_day: usesDueDays ? dayFromPicker(dueDatePicker) : undefined,
        due_day_2: frequency === "semi_monthly" ? dayFromPicker(dueDatePicker2) : undefined,
        anchor_date: needsAnchorDate(frequency) && anchorDate ? anchorDate : undefined,
        recurring,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={card + " space-y-4 mb-6 border border-emerald-500/10"}>
      <h2 className="text-sm font-semibold text-slate-200">{initial ? "Edit Bill" : "Add Bill"}</h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Netflix"
            className={inputCls}
          />
        </div>

        {/* Amount */}
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Amount <span className="text-slate-600">(per occurrence)</span></label>
          <CurrencyInput value={amount} onChange={setAmount} className={inputCls + " tabular-nums"} />
        </div>

        {/* Category */}
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>
            Category <span className="text-slate-600">(optional)</span>
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Utilities"
            className={inputCls}
          />
        </div>

        {/* Frequency */}
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as BillFrequency)}
            className={inputCls}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{frequencyLabel(f)}</option>
            ))}
          </select>
        </div>

        {/* Due day(s) — monthly and semi_monthly */}
        {usesDueDays && (
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>
              {frequency === "semi_monthly" ? "First due date" : "Due date"}{" "}
              <span className="text-slate-600">(pick any month)</span>
            </label>
            <DateInput value={dueDatePicker} onChange={setDueDatePicker} className={inputCls + " cursor-pointer"} />
          </div>
        )}

        {frequency === "semi_monthly" && (
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>
              Second due date <span className="text-slate-600">(pick any month)</span>
            </label>
            <DateInput value={dueDatePicker2} onChange={setDueDatePicker2} className={inputCls + " cursor-pointer"} />
          </div>
        )}

        {/* Anchor date — non-monthly/semi_monthly */}
        {needsAnchorDate(frequency) && (
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>A known due date</label>
            <DateInput value={anchorDate} onChange={setAnchorDate} className={inputCls + " cursor-pointer"} />
          </div>
        )}

        {/* Recurring toggle */}
        <div className="col-span-2 flex items-center gap-2">
          <input
            id="recurring"
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="accent-emerald-500"
          />
          <label htmlFor="recurring" className="text-sm text-slate-300">Recurring</label>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className={btn.primary}>
          {saving ? "Saving…" : initial ? "Save Changes" : "Add Bill"}
        </button>
        <button type="button" onClick={onCancel} className={btn.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Discretionary section ─────────────────────────────────────────────────────

function DiscretionarySection() {
  const [items, setItems] = useState<DiscretionaryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscretionaryItem | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/discretionary");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleSave(name: string, amount: number, frequency: DiscretionaryFrequency, id?: string) {
    const url = id ? `/api/discretionary/${id}` : "/api/discretionary";
    const method = id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount, frequency }),
    });
    if (res.ok) { setShowForm(false); setEditing(null); await load(); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/discretionary/${id}`, { method: "DELETE" });
    setConfirmingId(null);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Discretionary</h2>
          <p className="text-sm text-slate-500 mt-0.5">Reserved amounts kept as a buffer each paycheck</p>
        </div>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className={btn.primarySm}>
            + Add
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <DiscretionaryForm
          initial={editing ?? undefined}
          onSave={(name, amount, frequency) => handleSave(name, amount, frequency, editing?.id)}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {items.length === 0 && !showForm ? (
        <p className="text-slate-500 text-sm">No discretionary items yet.</p>
      ) : (
        <div className={card}>
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-100">{item.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{DISC_FREQUENCIES.find((f) => f.value === item.frequency)?.label ?? "Monthly"}</p>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <span className="tabular-nums text-sm font-semibold text-slate-200">
                  {fmt$(item.amount)}
                </span>
                <button
                  onClick={() => { setEditing(item); setShowForm(false); setConfirmingId(null); }}
                  className="text-xs font-medium text-slate-400 transition-colors duration-150 hover:text-slate-200"
                >
                  Edit
                </button>
                <DeleteConfirm
                  id={item.id}
                  confirmingId={confirmingId}
                  onRequest={() => setConfirmingId(item.id)}
                  onConfirm={() => handleDelete(item.id)}
                  onCancel={() => setConfirmingId(null)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DISC_FREQUENCIES: { value: DiscretionaryFrequency; label: string }[] = [
  { value: "monthly",      label: "Monthly" },
  { value: "semi_monthly", label: "Twice a month" },
  { value: "biweekly",     label: "Every 2 weeks" },
  { value: "weekly",       label: "Weekly" },
];

function DiscretionaryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DiscretionaryItem;
  onSave: (name: string, amount: number, frequency: DiscretionaryFrequency) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? Number(initial.amount).toFixed(2) : "0.00");
  const [frequency, setFrequency] = useState<DiscretionaryFrequency>(initial?.frequency ?? "monthly");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(name.trim(), parseFloat(amount), frequency); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className={card + " space-y-3 border border-emerald-500/10"}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Label</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spending buffer"
            className={inputCls}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Amount <span className="text-slate-600">(per occurrence)</span></label>
          <CurrencyInput value={amount} onChange={setAmount} className={inputCls + " tabular-nums"} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as DiscretionaryFrequency)}
            className={inputCls}
          >
            {DISC_FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className={btn.primary}>
          {saving ? "Saving…" : initial ? "Save Changes" : "Add"}
        </button>
        <button type="button" onClick={onCancel} className={btn.secondary}>Cancel</button>
      </div>
    </form>
  );
}

// ── Sortable bill row ─────────────────────────────────────────────────────────

function SortableBillRow({
  bill, confirmingId, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: {
  bill: Bill;
  confirmingId: string | null;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bill.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="group flex items-center gap-2 py-4 border-b border-slate-700/50 last:border-0"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 touch-none"
        tabIndex={-1}
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="4" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
          <circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
          <circle cx="4" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
        </svg>
      </button>

      <div className="flex items-center justify-between flex-1 min-w-0">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-100 truncate">{bill.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {frequencyLabel(bill.frequency)} · next {formatDueDate(bill)}
            {!bill.recurring && " · one-time"}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="tabular-nums text-base font-bold text-slate-200">{fmt$(bill.amount)}</span>
          <button onClick={onEdit} className="text-xs font-medium text-slate-400 transition-colors duration-150 hover:text-slate-200">Edit</button>
          <DeleteConfirm
            id={bill.id}
            confirmingId={confirmingId}
            onRequest={onDeleteRequest}
            onConfirm={onDeleteConfirm}
            onCancel={onDeleteCancel}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sortable category card ────────────────────────────────────────────────────

function SortableCategoryCard({
  cat, children,
}: {
  cat: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `cat:${cat}` });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={card + " group"}
    >
      <div className="flex items-center gap-2 mb-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 touch-none"
          tabIndex={-1}
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="4" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
            <circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
            <circle cx="4" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
          </svg>
        </button>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{cat}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    const res = await fetch("/api/bills");
    if (res.ok) setBills(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function persistOrder(ordered: Bill[]) {
    await fetch("/api/bills/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ordered.map((b, i) => ({ id: b.id, sort_order: i }))),
    });
  }

  function grouped(billList: Bill[]) {
    return billList.reduce<Record<string, Bill[]>>((acc, b) => {
      const key = b.category ?? "Uncategorized";
      (acc[key] ??= []).push(b);
      return acc;
    }, {});
  }

  function categories(billList: Bill[]) {
    // Order by first appearance in the sorted bill list
    const seen = new Set<string>();
    const order: string[] = [];
    for (const b of billList) {
      const k = b.category ?? "Uncategorized";
      if (!seen.has(k)) { seen.add(k); order.push(k); }
    }
    return order;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId   = String(over.id);

    let newBills: Bill[];

    if (activeId.startsWith("cat:") && overId.startsWith("cat:")) {
      // Reorder entire category blocks
      const cats = categories(bills);
      const fromIdx = cats.indexOf(activeId.slice(4));
      const toIdx   = cats.indexOf(overId.slice(4));
      const newCats = arrayMove(cats, fromIdx, toIdx);
      const g = grouped(bills);
      newBills = newCats.flatMap((c) => g[c] ?? []);
    } else if (!activeId.startsWith("cat:") && !overId.startsWith("cat:")) {
      // Reorder bill within (or between) categories
      const oldIdx = bills.findIndex((b) => b.id === activeId);
      const newIdx = bills.findIndex((b) => b.id === overId);
      newBills = arrayMove(bills, oldIdx, newIdx);
    } else {
      return;
    }

    setBills(newBills);
    await persistOrder(newBills);
  }

  async function handleAdd(data: BillInput) {
    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { setShowForm(false); await load(); }
  }

  async function handleEdit(data: BillInput) {
    if (!editing) return;
    const res = await fetch(`/api/bills/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { setEditing(null); await load(); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/bills/${id}`, { method: "DELETE" });
    setConfirmingId(null);
    await load();
  }

  const g = grouped(bills);
  const cats = categories(bills);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className={btn.primarySm}>
            + Add Bill
          </button>
        )}
      </div>

      {showForm && <BillForm onSave={handleAdd} onCancel={() => setShowForm(false)} />}
      {editing  && <BillForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} />}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : bills.length === 0 ? (
        <p className="text-slate-500 text-sm">No bills added yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cats.map((c) => `cat:${c}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {cats.map((cat) => (
                <SortableCategoryCard key={cat} cat={cat}>
                  <SortableContext items={(g[cat] ?? []).map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    {(g[cat] ?? []).map((bill) => (
                      <SortableBillRow
                        key={bill.id}
                        bill={bill}
                        confirmingId={confirmingId}
                        onEdit={() => { setShowForm(false); setEditing(bill); setConfirmingId(null); }}
                        onDeleteRequest={() => setConfirmingId(bill.id)}
                        onDeleteConfirm={() => handleDelete(bill.id)}
                        onDeleteCancel={() => setConfirmingId(null)}
                      />
                    ))}
                  </SortableContext>
                </SortableCategoryCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <hr className="border-slate-700/50" />
      <DiscretionarySection />
    </div>
  );
}

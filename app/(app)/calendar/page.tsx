"use client";

import { useEffect, useRef, useState } from "react";
import type { Bill } from "@/lib/types";
import type { BillFrequency } from "@/lib/bills";
import { useMonth } from "@/components/MonthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaySchedule {
  id: string;
  name: string;
  amount: number;
  frequency: "twice_monthly" | "monthly" | "biweekly" | "once";
  anchor_date: string | null;
  pay_day_1: number | null;
  pay_day_2: number | null;
  end_date: string | null;
}

interface CalendarEvent {
  type: "bill" | "paycheck" | "planned";
  name: string;
  amount: number;
}

interface PlannedExpense {
  id: string;
  name: string;
  amount: number;
  planned_date: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function addInterval(date: Date, frequency: BillFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "weekly":      d.setDate(d.getDate() + 7);   break;
    case "biweekly":    d.setDate(d.getDate() + 14);  break;
    case "quarterly":   d.setMonth(d.getMonth() + 3); break;
    case "semi_annual": d.setMonth(d.getMonth() + 6); break;
    case "annual":      d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

/** Returns all day-of-month numbers (1-based) this bill is due in the given month */
function billDaysInMonth(bill: Bill, year: number, month: number): number[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0);
  const days: number[] = [];

  if (bill.frequency === "monthly") {
    if (bill.due_day && bill.due_day <= monthEnd.getDate()) days.push(bill.due_day);
    return days;
  }

  if (bill.frequency === "semi_monthly") {
    if (!bill.due_day) return [];
    if (bill.due_day <= monthEnd.getDate()) days.push(bill.due_day);
    const d2 = bill.due_day_2 ?? (bill.due_day <= 15 ? bill.due_day + 15 : bill.due_day - 15);
    if (d2 !== bill.due_day && d2 >= 1 && d2 <= monthEnd.getDate()) days.push(d2);
    return days;
  }

  // Anchor-based: advance from anchor until we pass month end
  if (!bill.anchor_date) return [];
  let cur = new Date(String(bill.anchor_date).slice(0, 10) + "T00:00:00");
  // Rewind if anchor is ahead of month (shouldn't happen often, but be safe)
  // Fast-forward to near the month
  while (cur < monthStart) cur = addInterval(cur, bill.frequency);
  // Rewind one step in case we overshot
  // Collect all dates in the month
  while (cur <= monthEnd) {
    if (cur >= monthStart) days.push(cur.getDate());
    cur = addInterval(cur, bill.frequency);
  }
  return days;
}

/** Returns all day-of-month numbers a pay schedule pays in the given month */
function payDaysInMonth(schedule: PaySchedule, year: number, month: number): number[] {
  const monthEnd = new Date(year, month + 1, 0).getDate();
  const days: number[] = [];

  if (schedule.frequency === "twice_monthly") {
    if (schedule.pay_day_1 && schedule.pay_day_1 <= monthEnd) days.push(schedule.pay_day_1);
    if (schedule.pay_day_2 && schedule.pay_day_2 <= monthEnd) days.push(schedule.pay_day_2);
    return days;
  }

  if (schedule.frequency === "monthly") {
    if (schedule.pay_day_1 && schedule.pay_day_1 <= monthEnd) days.push(schedule.pay_day_1);
    return days;
  }

  if (schedule.frequency === "biweekly") {
    if (!schedule.anchor_date) return [];
    const monthStart = new Date(year, month, 1);
    const monthEndDate = new Date(year, month + 1, 0);
    let cur = new Date(String(schedule.anchor_date).slice(0, 10) + "T00:00:00");
    while (cur < monthStart) { cur = new Date(cur); cur.setDate(cur.getDate() + 14); }
    while (cur <= monthEndDate) {
      days.push(cur.getDate());
      cur = new Date(cur); cur.setDate(cur.getDate() + 14);
    }
    return days;
  }

  if (schedule.frequency === "once" && schedule.anchor_date) {
    const d = new Date(String(schedule.anchor_date).slice(0, 10) + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) days.push(d.getDate());
    return days;
  }

  return days;
}

// ── Day detail popup ──────────────────────────────────────────────────────────

function DayPopup({
  day, month, year, events, onClose,
}: {
  day: number; month: number; year: number;
  events: CalendarEvent[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const label = new Date(year, month, day).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div ref={ref} className="w-full max-w-sm rounded-xl bg-slate-800 ring-1 ring-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <p className="text-sm font-semibold text-slate-100">{label}</p>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors text-lg leading-none">✕</button>
        </div>
        <ul className="p-3 space-y-2">
          {events.map((e, i) => (
            <li
              key={i}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                e.type === "paycheck" ? "bg-emerald-500/10" : e.type === "planned" ? "bg-orange-400/10" : "bg-rose-500/10"
              }`}
            >
              <div>
                <p className={`text-sm font-semibold ${e.type === "paycheck" ? "text-emerald-300" : e.type === "planned" ? "text-orange-300" : "text-rose-300"}`}>
                  {e.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">{e.type === "planned" ? "Planned expense" : e.type}</p>
              </div>
              <span className={`tabular-nums text-sm font-bold ${e.type === "paycheck" ? "text-emerald-400" : e.type === "planned" ? "text-orange-400" : "text-slate-200"}`}>
                {fmt$(e.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

const DAY_LABELS_FULL  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_SHORT = ["S",   "M",   "T",   "W",   "T",   "F",   "S"];
const MAX_VISIBLE = 2;

function CalendarGrid({
  year,
  month,
  eventsByDay,
}: {
  year: number;
  month: number;
  eventsByDay: Map<number, CalendarEvent[]>;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  return (
    <>
      <div className="w-full rounded-xl bg-slate-800 ring-1 ring-white/5 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-700/60">
          {DAY_LABELS_FULL.map((d, i) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{DAY_LABELS_SHORT[i]}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }).map((_, i) => {
            const day = i - firstDow + 1;
            const inMonth = day >= 1 && day <= daysInMonth;
            const events = inMonth ? (eventsByDay.get(day) ?? []) : [];
            const isToday = day === todayDate;
            const visible = events.slice(0, MAX_VISIBLE);
            const overflow = events.length - MAX_VISIBLE;
            const clickable = inMonth && events.length > 0;

            return (
              <div
                key={i}
                onClick={() => clickable && setSelectedDay(day)}
                className={`min-h-14 sm:min-h-22.5 lg:min-h-32.5 p-1 sm:p-1.5 border-b border-r border-slate-700/40
                  ${inMonth ? "" : "bg-slate-800/30"}
                  ${clickable ? "cursor-pointer hover:bg-slate-700/30 transition-colors" : ""}
                `}
              >
                {inMonth && (
                  <>
                    <span className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                      isToday ? "bg-emerald-500 text-white" : "text-slate-400"
                    }`}>
                      {day}
                    </span>

                    {/* Mobile: colored dots only */}
                    {events.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 sm:hidden">
                        {events.slice(0, 3).map((e, ei) => (
                          <span
                            key={ei}
                            className={`h-1.5 w-1.5 rounded-full ${
                              e.type === "paycheck" ? "bg-emerald-400" : e.type === "planned" ? "bg-orange-400" : "bg-rose-400"
                            }`}
                          />
                        ))}
                        {events.length > 3 && (
                          <span className="text-slate-500 text-[9px] leading-none">+{events.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* sm+: full event pills */}
                    <div className="hidden sm:block space-y-0.5">
                      {visible.map((e, ei) => (
                        <div
                          key={ei}
                          className={`flex items-center justify-between rounded px-1.5 py-0.5 text-xs leading-tight ${
                            e.type === "paycheck"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : e.type === "planned"
                              ? "bg-orange-400/15 text-orange-300"
                              : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          <span className="truncate font-medium">{e.name}</span>
                          <span className="tabular-nums ml-1 shrink-0 opacity-80">{fmt$(e.amount)}</span>
                        </div>
                      ))}
                      {overflow > 0 && (
                        <button className="text-xs text-slate-400 hover:text-slate-200 font-medium pl-1 transition-colors">
                          +{overflow} more
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay !== null && (
        <DayPopup
          day={selectedDay}
          month={month}
          year={year}
          events={eventsByDay.get(selectedDay) ?? []}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { year, month } = useMonth();

  const [bills, setBills]         = useState<Bill[]>([]);
  const [schedules, setSchedules] = useState<PaySchedule[]>([]);
  const [planned, setPlanned]     = useState<PlannedExpense[]>([]);
  const [loading, setLoading]     = useState(true);

  // Reload bills/schedules once; reload planned expenses when month changes
  useEffect(() => {
    Promise.all([
      fetch("/api/bills").then((r) => r.json()),
      fetch("/api/pay-schedule").then((r) => r.json()),
    ]).then(([b, s]) => {
      setBills(Array.isArray(b) ? b : []);
      setSchedules(Array.isArray(s) ? s : []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/planned-expenses?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((p) => { setPlanned(Array.isArray(p) ? p : []); setLoading(false); });
  }, [year, month]);

  // Build events map: day → events[]
  const eventsByDay = new Map<number, CalendarEvent[]>();

  function addEvent(day: number, event: CalendarEvent) {
    const existing = eventsByDay.get(day) ?? [];
    eventsByDay.set(day, [...existing, event]);
  }

  for (const bill of bills.filter((b) => b.active)) {
    for (const day of billDaysInMonth(bill, year, month)) {
      addEvent(day, { type: "bill", name: bill.name, amount: Number(bill.amount) });
    }
  }

  const activeSchedules = schedules.filter((s) => {
    if (!s.end_date) return true;
    const endDate = new Date(String(s.end_date).slice(0, 10) + "T00:00:00");
    return endDate >= new Date(year, month, 1);
  });

  for (const schedule of activeSchedules) {
    for (const day of payDaysInMonth(schedule, year, month)) {
      addEvent(day, { type: "paycheck", name: schedule.name, amount: Number(schedule.amount) });
    }
  }

  for (const p of planned) {
    const d = new Date(String(p.planned_date).slice(0, 10) + "T00:00:00");
    addEvent(d.getDate(), { type: "planned", name: p.name, amount: Number(p.amount) });
  }

  // Sort each day: paychecks first, then planned, then bills
  const typeOrder = { paycheck: 0, planned: 1, bill: 2 };
  for (const [day, events] of eventsByDay) {
    eventsByDay.set(day, events.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]));
  }

  return (
    <div className="w-full overflow-hidden space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <div className="hidden sm:flex items-center gap-4">
          {[
            { color: "bg-emerald-500/60", label: "Paycheck" },
            { color: "bg-orange-400/60",  label: "Planned" },
            { color: "bg-rose-500/60",    label: "Bill" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-slate-800 ring-1 ring-white/5 h-96 animate-pulse" />
      ) : (
        <CalendarGrid year={year} month={month} eventsByDay={eventsByDay} />
      )}
    </div>
  );
}

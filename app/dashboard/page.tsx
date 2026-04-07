// Paycheck view — the main landing page after login
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Paycheck Overview</h1>

      {/* TODO: Replace with real data from /api/paychecks */}
      <section className="rounded-xl bg-slate-800 p-4 space-y-2">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Current Paycheck
        </h2>
        <p className="text-3xl font-bold">$0.00</p>
        <p className="text-sm text-slate-400">Next pay date: —</p>
      </section>

      <section className="rounded-xl bg-slate-800 p-4 space-y-3">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Bills Before Next Paycheck
        </h2>
        <p className="text-slate-500 text-sm">No bills loaded yet.</p>
      </section>

      <section className="rounded-xl bg-slate-800 p-4 space-y-2">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Suggested Savings Transfer
        </h2>
        <p className="text-3xl font-bold text-emerald-400">$0.00</p>
      </section>

      <section className="rounded-xl bg-slate-800 p-4 space-y-2">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Leftover Discretionary
        </h2>
        <p className="text-3xl font-bold text-sky-400">$0.00</p>
      </section>
    </div>
  );
}

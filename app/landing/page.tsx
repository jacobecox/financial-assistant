import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-slate-50">PayClarity</h1>
          <p className="text-slate-400 text-lg">
            Track bills, paychecks, and savings — together.
          </p>
          <p className="text-slate-500 text-sm">
            A shared household budget tool that keeps both of you on the same page.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 text-left">
          {[
            { icon: "📋", label: "Bills & recurring expenses", desc: "Track every bill with due dates and amounts." },
            { icon: "💰", label: "Paycheck planning", desc: "See exactly how much you can save each pay period." },
            { icon: "🏠", label: "Shared household", desc: "Invite your partner — one view of your finances together." },
            { icon: "🤖", label: "AI assistant", desc: "Ask questions about your budget in plain English." },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl bg-slate-800/50 px-4 py-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/sign-up"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

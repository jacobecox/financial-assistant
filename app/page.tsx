import Link from "next/link";

// ─── Feature cards ────────────────────────────────────────────────────────────

const features = [
  {
    icon: "📈",
    title: "Know your savings potential",
    desc: "See exactly how much you can set aside each pay period — after every bill, planned expense, and buffer is accounted for.",
  },
  {
    icon: "📋",
    title: "Every expense, under control",
    desc: "Track recurring bills and one-time costs with due dates and amounts so nothing sneaks up on you.",
  },
  {
    icon: "💸",
    title: "Built around your paycheck",
    desc: "Model any pay schedule — twice monthly, biweekly, or monthly — and watch your monthly picture update instantly.",
  },
  {
    icon: "🏠",
    title: "Shared household finances",
    desc: "Invite your partner so both of you are looking at the same numbers and working toward the same goals.",
  },
  {
    icon: "🤖",
    title: "Ask anything",
    desc: "Chat with an AI assistant that knows your budget. Ask \"how much can I save this month?\" and get a real answer.",
  },
  {
    icon: "🔗",
    title: "Account linking — coming soon",
    desc: "Connect your savings and investment accounts to see your full wealth picture alongside your budget.",
    dim: true,
  },
];

// ─── Steps ────────────────────────────────────────────────────────────────────

const steps = [
  {
    n: "1",
    title: "Add your pay schedule",
    desc: "Enter your paycheck amount and frequency. PayClarity calculates your monthly income automatically.",
  },
  {
    n: "2",
    title: "Add your bills & expenses",
    desc: "Log every recurring bill. The app tracks due dates and maps each expense to your monthly total.",
  },
  {
    n: "3",
    title: "See what you can save",
    desc: "Your overview shows income, expenses, and your recommended savings amount — updated in real time.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-6">
          Built for savers, not just budgeters
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl">
          Know exactly how much{" "}
          <span className="text-emerald-400">you can save</span>{" "}
          every month
        </h1>
        <p className="mt-4 text-slate-400 text-lg max-w-xl">
          PayClarity maps your paychecks to your bills and expenses so you always know your real savings number — not a guess.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:justify-center">
          <Link
            href="/sign-up"
            className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors text-center"
          >
            Get started free
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors text-center"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 pb-16 max-w-4xl mx-auto">
        <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 mb-8">
          Everything you need to build wealth
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon, title, desc, dim }) => (
            <div
              key={title}
              className={`rounded-xl bg-slate-800/60 ring-1 ring-white/5 p-5 space-y-2 ${dim ? "opacity-50" : ""}`}
            >
              <span className="text-2xl">{icon}</span>
              <p className={`text-sm font-semibold ${dim ? "text-slate-400" : "text-slate-100"}`}>
                {title}
                {dim && (
                  <span className="ml-2 text-xs font-medium text-slate-500 bg-slate-700 rounded px-1.5 py-0.5">
                    Soon
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 pb-16 max-w-3xl mx-auto">
        <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 mb-8">
          Up and running in minutes
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="flex-1 flex flex-col items-start gap-3 rounded-xl bg-slate-800/60 ring-1 ring-white/5 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-400">
                {n}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">{title}</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 pb-20 flex flex-col items-center text-center gap-4">
        <p className="text-slate-400 text-sm max-w-sm">
          Stop guessing what you can afford to save. Start with a clear number.
        </p>
        <Link
          href="/sign-up"
          className="rounded-lg bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Get started free
        </Link>
        <p className="text-xs text-slate-600">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-slate-500 hover:text-slate-400 transition-colors underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </section>

    </main>
  );
}

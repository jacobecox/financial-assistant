import Link from "next/link";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconTrendUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function IconBank() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconPiggyBank() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z" /><path d="M2 9v1a2 2 0 0 0 2 2h1" /><path d="M16 11h.01" />
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69H21l-4.94 3.58a1 1 0 0 0-.36 1.12L17.56 20 12 16.18 6.44 20l1.86-5.85a1 1 0 0 0-.36-1.12L3 9.45h6.17a1 1 0 0 0 .95-.69z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconPaycheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const pillars = [
  {
    Icon: IconTrendUp,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    title: "Track net worth",
    desc: "Connect every account and watch your true net worth — assets minus liabilities — grow over time with a built-in history chart.",
  },
  {
    Icon: IconPiggyBank,
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    title: "Maximize savings",
    desc: "See your exact savings potential each paycheck — bills, planned expenses, and buffers already deducted. No guesswork.",
  },
  {
    Icon: IconSparkle,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    title: "AI-powered guidance",
    desc: "Ask your AI assistant anything — \"how much can I save this month?\" — and get a real answer based on your actual numbers.",
  },
];

const features = [
  { Icon: IconBank,     title: "5,000+ supported institutions",  desc: "Chase, Ally, Fidelity, Empower, and more" },
  { Icon: IconPaycheck, title: "Any pay schedule",               desc: "Twice monthly, biweekly, monthly, or one-time" },
  { Icon: IconCalendar, title: "Bill calendar",                  desc: "See every upcoming bill laid out by month" },
  { Icon: IconUsers,    title: "Shared household finances",      desc: "Invite a partner to share the same view" },
];

const steps = [
  {
    n: "1",
    title: "Link your accounts",
    desc: "Securely connect your bank and investment accounts. PayClarity instantly shows your live balances and net worth.",
  },
  {
    n: "2",
    title: "Add your income & bills",
    desc: "Enter your pay schedule and recurring expenses. Everything maps to your monthly picture automatically.",
  },
  {
    n: "3",
    title: "Save with confidence",
    desc: "See your net worth, exact savings potential, and AI recommendations — all in one clear overview.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-6">
          Your complete financial picture
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
          Build wealth with{" "}
          <span className="text-emerald-400">complete clarity</span>
        </h1>
        <p className="mt-5 text-slate-400 text-lg max-w-xl leading-relaxed">
          Track your net worth, maximize your savings, and get AI-powered guidance — all connected to your real accounts.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:justify-center">
          <Link href="/sign-up" className="rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors text-center">
            Get started free
          </Link>
          <Link href="/sign-in" className="rounded-lg bg-slate-800 px-7 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors text-center">
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Three pillars ── */}
      <section className="px-6 pb-16 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {pillars.map(({ Icon, color, bg, title, desc }) => (
            <div key={title} className="rounded-xl bg-slate-800/60 ring-1 ring-white/5 p-6 flex flex-col gap-4">
              <div className={`w-10 h-10 rounded-lg ${bg} ${color} flex items-center justify-center`}>
                <Icon />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-100">{title}</p>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features list ── */}
      <section className="px-6 pb-16 max-w-2xl mx-auto">
        <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 mb-6">
          Also included
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {features.map(({ Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 text-slate-500">
                <Icon />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
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

      {/* ── Security callout ── */}
      <section className="px-6 pb-16 max-w-3xl mx-auto">
        <div className="rounded-xl bg-slate-800/40 ring-1 ring-white/5 p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-700/60 text-slate-400 flex items-center justify-center shrink-0">
            <IconShield />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Your data is always secure</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Account linking is powered by Plaid, trusted by millions of users. Your bank credentials are never stored — only encrypted access tokens that let us read balances on your behalf.
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 pb-24 flex flex-col items-center text-center gap-4">
        <h2 className="text-2xl font-bold text-slate-50">Ready to see your full picture?</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          Link your accounts, set your budget, and know exactly where you stand — in minutes.
        </p>
        <Link href="/sign-up" className="mt-2 rounded-lg bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors">
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type PlaidAccount = {
  plaid_account_id: string;
  plaid_item_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  institution_name: string;
  institution_id: string;
  updated_at: string;
};

type HistoryPoint = { date: string; net_worth: number };

type Range = { label: string; days: number };
const RANGES: Range[] = [
  { label: "30D",  days: 30  },
  { label: "3M",   days: 90  },
  { label: "6M",   days: 180 },
  { label: "1Y",   days: 365 },
  { label: "YTD",  days: -1  }, // special case handled in fetch
];

const card = "rounded-xl bg-slate-800 ring-1 ring-white/5 p-4";

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function AccountRow({ account }: { account: PlaidAccount }) {
  return (
    <div className="flex items-center justify-between py-3 px-1 border-b border-white/5 last:border-0">
      <div className="min-w-0">
        <p className="text-base font-medium text-slate-200 truncate">
          {account.name}
          {account.mask && <span className="ml-1.5 text-slate-500 text-sm">···{account.mask}</span>}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 capitalize">{account.institution_name}</p>
      </div>
      <div className="text-right ml-4 shrink-0">
        <p className="text-base font-semibold text-slate-100 tabular-nums">{fmt(account.current_balance)}</p>
        {account.available_balance != null && account.available_balance !== account.current_balance && (
          <p className="text-xs text-slate-500 tabular-nums">{fmt(account.available_balance)} avail.</p>
        )}
      </div>
    </div>
  );
}

function AccountGroup({ label, accent, accounts }: { label: string; accent: string; accounts: PlaidAccount[] }) {
  if (accounts.length === 0) return null;
  const total = accounts.reduce((s, a) => s + Number(a.current_balance ?? 0), 0);
  return (
    <div className={`${card} border-l-2 ${accent}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-base font-semibold text-slate-200 tabular-nums">{fmt(total)}</p>
      </div>
      <div>{accounts.map((a) => <AccountRow key={a.plaid_account_id} account={a} />)}</div>
    </div>
  );
}

function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plaid/link-token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setLinkToken(d.link_token))
      .finally(() => setLoading(false));
  }, []);

  const handleSuccess = useCallback(
    async (publicToken: string, metadata: { institution?: { institution_id: string; name: string } | null }) => {
      await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token: publicToken,
          institution_id: metadata.institution?.institution_id ?? "",
          institution_name: metadata.institution?.name ?? "",
        }),
      });
      onSuccess();
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({ token: linkToken ?? "", onSuccess: handleSuccess });

  return (
    <button
      onClick={() => open()}
      disabled={!ready || loading}
      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
    >
      {loading ? "Loading…" : "+ Link Account"}
    </button>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-slate-700 ring-1 ring-white/10 px-3 py-2 text-sm shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-slate-50 font-semibold tabular-nums">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts]   = useState<PlaidAccount[]>([]);
  const [history, setHistory]     = useState<HistoryPoint[]>([]);
  const [range, setRange]         = useState<Range>(RANGES[0]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<{ itemId: string; name: string } | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res  = await fetch("/api/plaid/accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      setError("Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (r: Range) => {
    const days = r.days === -1
      ? Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000)
      : r.days;
    try {
      const res  = await fetch(`/api/plaid/net-worth-history?days=${days}`);
      const data = await res.json();
      setHistory(
        (data.history ?? []).map((p: HistoryPoint) => ({
          ...p,
          net_worth: Number(p.net_worth),
          label: new Date(p.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        }))
      );
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadHistory(range); }, [loadHistory, range]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/plaid/sync", { method: "POST" });
      await Promise.all([loadAccounts(), loadHistory(range)]);
    } catch {
      setError("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleUnlink = async (plaidItemId: string) => {
    setUnlinking(plaidItemId);
    setConfirmUnlink(null);
    try {
      await fetch("/api/plaid/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaid_item_id: plaidItemId }),
      });
      await Promise.all([loadAccounts(), loadHistory(range)]);
    } catch {
      setError("Failed to unlink. Please try again.");
    } finally {
      setUnlinking(null);
    }
  };

  const checking    = accounts.filter((a) => a.subtype === "checking");
  const savings     = accounts.filter((a) => ["savings", "money market", "cd"].includes(a.subtype ?? ""));
  const investments = accounts.filter((a) => a.type === "investment" || a.type === "brokerage");
  const other       = accounts.filter(
    (a) => !checking.includes(a) && !savings.includes(a) && !investments.includes(a)
  );

  const netWorth = accounts.reduce((s, a) => s + Number(a.current_balance ?? 0), 0);

  const institutions = Object.values(
    accounts.reduce<Record<string, { itemId: string; name: string }>>((acc, a) => {
      if (!acc[a.plaid_item_id]) acc[a.plaid_item_id] = { itemId: a.plaid_item_id, name: a.institution_name };
      return acc;
    }, {})
  );

  const lastSynced = accounts[0]?.updated_at
    ? new Date(accounts[0].updated_at).toLocaleString()
    : null;

  const chartMin = history.length
    ? Math.floor(Math.min(...history.map((p) => p.net_worth)) * 0.97)
    : 0;
  const chartMax = history.length
    ? Math.ceil(Math.max(...history.map((p) => p.net_worth)) * 1.03)
    : 0;

  return (
    <div className="py-8 px-4 w-full max-w-6xl mx-auto space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50">Accounts</h1>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            {accounts.length > 0 && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                {syncing ? "Syncing…" : "Sync"}
              </button>
            )}
            <PlaidLinkButton onSuccess={loadAccounts} />
          </div>
          {lastSynced && <p className="text-xs text-slate-500">Last synced {lastSynced}</p>}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-300">✕</button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm py-8 text-center">Loading…</p>
      ) : accounts.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
          <p className="text-slate-400 font-medium">No accounts linked yet</p>
          <p className="text-sm text-slate-600 mt-1">Click &quot;+ Link Account&quot; to connect Chase, Ally, Fidelity, and more.</p>
        </div>
      ) : (
        <>
          {/* Net worth + chart — full width */}
          <div className={`${card} border-l-2 border-emerald-500`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Net Worth</p>
                <p className="text-5xl font-bold tabular-nums text-slate-50 mt-1">{fmt(netWorth)}</p>
              </div>
              {/* Range selector */}
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      range.label === r.label
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {history.length < 2 ? (
              <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                Sync a few more times to build your net worth history.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={history} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[chartMin, chartMax]}
                    tickFormatter={fmtShort}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="net_worth"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#nwGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#10b981" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Accounts + institutions */}
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <div className="flex-1 space-y-4 w-full">
              <AccountGroup label="Checking"    accent="border-blue-500"    accounts={checking} />
              <AccountGroup label="Savings"     accent="border-emerald-500" accounts={savings} />
              <AccountGroup label="Investments" accent="border-purple-500"  accounts={investments} />
              <AccountGroup label="Other"       accent="border-slate-500"   accounts={other} />
            </div>

            <div className="w-full lg:w-80 shrink-0">
              <div className={card}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Connected Institutions</p>

                {confirmUnlink && (
                  <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-300">
                      Remove <span className="font-semibold">{confirmUnlink.name}</span> and all its accounts?
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleUnlink(confirmUnlink.itemId)}
                        disabled={!!unlinking}
                        className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                      >
                        {unlinking ? "Removing…" : "Yes, remove"}
                      </button>
                      <button
                        onClick={() => setConfirmUnlink(null)}
                        className="px-3 py-1.5 rounded-md border border-white/10 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {institutions.map(({ itemId, name }) => (
                    <div key={itemId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-700/50">
                      <p className="text-sm text-slate-200">{name}</p>
                      <button
                        onClick={() => setConfirmUnlink({ itemId, name })}
                        disabled={!!unlinking}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                      >
                        Unlink
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

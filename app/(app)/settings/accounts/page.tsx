"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

type PlaidAccount = {
  plaid_account_id: string;
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

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function AccountCard({ account }: { account: PlaidAccount }) {
  const typeLabel = [account.type, account.subtype].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {account.name}
          {account.mask && <span className="ml-1 text-gray-400 text-sm">···{account.mask}</span>}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 capitalize">{typeLabel}</p>
      </div>
      <div className="text-right ml-4 shrink-0">
        <p className="font-semibold text-gray-900">{fmt(account.current_balance)}</p>
        {account.available_balance != null && account.available_balance !== account.current_balance && (
          <p className="text-xs text-gray-500">{fmt(account.available_balance)} available</p>
        )}
      </div>
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

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: handleSuccess,
  });

  if (loading || !linkToken) {
    return (
      <button disabled className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm opacity-60 cursor-not-allowed">
        Loading…
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
    >
      + Link Account
    </button>
  );
}

export default function LinkedAccountsPage() {
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      setError("Failed to load linked accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/plaid/sync", { method: "POST" });
      await loadAccounts();
    } catch {
      setError("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  // Group accounts by institution
  const byInstitution = accounts.reduce<Record<string, PlaidAccount[]>>((acc, a) => {
    const key = a.institution_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Linked Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">Connect your bank and investment accounts to see live balances.</p>
        </div>
        <div className="flex gap-2">
          {accounts.length > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {syncing ? "Syncing…" : "Sync"}
            </button>
          )}
          <PlaidLinkButton onSuccess={loadAccounts} />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-500 font-medium">No accounts linked yet</p>
          <p className="text-sm text-gray-400 mt-1">Click &quot;+ Link Account&quot; to connect Chase, Ally, Fidelity, and more.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byInstitution).map(([institution, accts]) => (
            <div key={institution}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{institution}</h2>
              <div className="space-y-2">
                {accts.map((a) => <AccountCard key={a.plaid_account_id} account={a} />)}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 text-right">
            Last synced: {new Date(accounts[0]?.updated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

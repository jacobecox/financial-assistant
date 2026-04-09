"use client";

import { useEffect, useState } from "react";

type Member = { user_id: string; role: string; joined_at: string; name: string | null; email: string | null };
type Household = { id: string; name: string };

type PageState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "ready"; household: Household; members: Member[] }
  | { status: "error"; message: string };

export default function HouseholdPage() {
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [creating, setCreating] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    setState({ status: "loading" });
    const res = await fetch("/api/household");
    if (res.status === 404) { setState({ status: "none" }); return; }
    if (!res.ok) { setState({ status: "error", message: "Failed to load household." }); return; }
    const data = await res.json();
    setState({ status: "ready", household: data.household, members: data.members });
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: householdName.trim() || "My Household" }),
      });
      if (!res.ok) {
        const d = await res.json();
        setState({ status: "error", message: d.error ?? "Failed to create household." });
        return;
      }
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerateInvite() {
    setInviteLoading(true);
    setInviteUrl(null);
    setCopied(false);
    try {
      const res = await fetch("/api/household/invite", { method: "POST" });
      const data = await res.json();
      if (res.ok) setInviteUrl(data.url);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const card = "rounded-xl bg-slate-800 ring-1 ring-white/5 p-5 space-y-4";

  if (state.status === "loading") {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  if (state.status === "error") {
    return <p className="text-sm text-rose-400">{state.message}</p>;
  }

  if (state.status === "none") {
    return (
      <div className="space-y-6 max-w-sm">
        <h1 className="text-xl font-bold text-slate-50">Household</h1>
        <div className={card}>
          <p className="text-sm text-slate-400">You're not part of a household yet. Create one to get started.</p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Household name (optional)"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating…" : "Create Household"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { household, members } = state;

  return (
    <div className="space-y-6 max-w-sm">
      <h1 className="text-xl font-bold text-slate-50">Household</h1>

      <div className={card}>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          {household.name}
        </h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-slate-200 truncate">{m.name ?? m.email ?? m.user_id}</span>
                {m.name && m.email && (
                  <span className="text-xs text-slate-500 truncate">{m.email}</span>
                )}
              </div>
              <span className="text-xs text-slate-500 capitalize ml-3 shrink-0">{m.role}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={card}>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Invite Someone</h2>
        <p className="text-sm text-slate-400">Generate a link valid for 24 hours. Each link can only be used once.</p>
        <button
          onClick={handleGenerateInvite}
          disabled={inviteLoading}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {inviteLoading ? "Generating…" : "Generate Invite Link"}
        </button>
        {inviteUrl && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 break-all bg-slate-900 rounded-lg px-3 py-2">{inviteUrl}</p>
            <button
              onClick={handleCopy}
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

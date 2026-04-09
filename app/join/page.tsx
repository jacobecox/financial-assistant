"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

type TokenState =
  | { status: "loading" }
  | { status: "invalid"; reason: string }
  | { status: "valid"; householdName: string; expiresAt: string }
  | { status: "joining" }
  | { status: "joined" }
  | { status: "error"; message: string };

export default function JoinPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<TokenState>({ status: "loading" });

  useEffect(() => {
    if (!token) { setState({ status: "invalid", reason: "No invite token provided." }); return; }

    fetch(`/api/household/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setState({ status: "valid", householdName: data.householdName, expiresAt: data.expiresAt });
        } else {
          const reason =
            data.reason === "expired"     ? "This invite link has expired." :
            data.reason === "already_used" ? "This invite link has already been used." :
            "This invite link is invalid.";
          setState({ status: "invalid", reason });
        }
      })
      .catch(() => setState({ status: "invalid", reason: "Could not validate invite link." }));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setState({ status: "joining" });
    try {
      const res = await fetch(`/api/household/invite/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setState({ status: "joined" });
        setTimeout(() => router.push("/"), 1500);
      } else {
        const message =
          data.error === "already_in_household" ? "You're already in a household." :
          data.error === "expired"              ? "This invite has expired." :
          data.error === "already_used"         ? "This invite has already been used." :
          "Something went wrong. Please try again.";
        setState({ status: "error", message });
      }
    } catch {
      setState({ status: "error", message: "Something went wrong. Please try again." });
    }
  }

  const card = "rounded-xl bg-slate-800 ring-1 ring-white/5 p-6 w-full max-w-sm";

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className={card + " space-y-4"}>
        <h1 className="text-xl font-bold text-slate-50">Household Invite</h1>

        {state.status === "loading" && (
          <p className="text-sm text-slate-400">Validating invite link…</p>
        )}

        {state.status === "invalid" && (
          <div className="space-y-3">
            <p className="text-sm text-rose-400">{state.reason}</p>
            <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              Go to app →
            </Link>
          </div>
        )}

        {state.status === "valid" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              You've been invited to join <span className="font-semibold text-white">{state.householdName}</span>.
            </p>
            <p className="text-xs text-slate-500">
              Expires {new Date(state.expiresAt).toLocaleString()}
            </p>
            {!isLoaded ? null : !isSignedIn ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-400">Sign in to accept this invite.</p>
                <Link
                  href={`/sign-in?redirect_url=/join?token=${token}`}
                  className="inline-flex items-center justify-center w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <button
                onClick={handleAccept}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Join household
              </button>
            )}
          </div>
        )}

        {state.status === "joining" && (
          <p className="text-sm text-slate-400">Joining household…</p>
        )}

        {state.status === "joined" && (
          <p className="text-sm text-emerald-400">Joined! Redirecting…</p>
        )}

        {state.status === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-rose-400">{state.message}</p>
            <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              Go to app →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HouseholdGate({
  hasHousehold,
  children,
}: {
  hasHousehold: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Always render the settings page so users can create/join a household
  if (hasHousehold || pathname.startsWith("/settings/household")) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
      <p className="text-slate-300">You're not part of a household yet.</p>
      <Link
        href="/settings/household"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
      >
        Set up your household
      </Link>
    </div>
  );
}

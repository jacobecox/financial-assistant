"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard",          label: "Overview", exact: true },
  { href: "/dashboard/paycheck", label: "Paycheck" },
  { href: "/dashboard/bills",    label: "Bills" },
  { href: "/dashboard/chat",     label: "Chat" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5">
      {links.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
              active
                ? "bg-emerald-600/20 text-emerald-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

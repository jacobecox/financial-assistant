"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "/overview",  label: "Overview", exact: true },
  { href: "/accounts",  label: "Accounts" },
  { href: "/income",    label: "Income" },
  { href: "/expenses",  label: "Expenses" },
  { href: "/calendar",  label: "Calendar" },
  { href: "/ask",       label: "Ask AI" },
];

export function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const activeLabel = links.find(({ href, exact }) =>
    exact ? pathname === href : pathname.startsWith(href)
  )?.label ?? "Menu";

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden sm:flex items-center gap-0.5">
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

      {/* Mobile hamburger */}
      <div ref={ref} className="relative sm:hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
          aria-label="Open navigation"
        >
          <span className="text-emerald-300 font-semibold">{activeLabel}</span>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-xl bg-slate-800 ring-1 ring-white/10 shadow-2xl shadow-black/50 overflow-hidden">
            {links.map(({ href, label, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-emerald-600/20 text-emerald-300"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

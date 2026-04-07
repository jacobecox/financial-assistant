import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="font-semibold text-slate-50 hover:text-white">
            Paycheck
          </Link>
          <Link href="/dashboard/bills" className="text-slate-400 hover:text-slate-200">
            Bills
          </Link>
          <Link href="/dashboard/chat" className="text-slate-400 hover:text-slate-200">
            Chat
          </Link>
        </nav>
        <UserButton afterSignOutUrl="/sign-in" />
      </header>
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">{children}</main>
    </div>
  );
}

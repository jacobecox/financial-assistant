import { UserButton } from "@clerk/nextjs";
import { NavLinks } from "@/components/NavLinks";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900">
        <NavLinks />
        <UserButton afterSignOutUrl="/sign-in" />
      </header>
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">{children}</main>
    </div>
  );
}

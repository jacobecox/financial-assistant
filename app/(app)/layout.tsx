import { auth } from "@clerk/nextjs/server";
import { NavLinks } from "@/components/NavLinks";
import { MonthProvider, MonthBar } from "@/components/MonthContext";
import { ChatProvider } from "@/components/ChatContext";
import { HouseholdGate } from "@/components/HouseholdGate";
import { AccountButton } from "@/components/AccountButton";
import { getHouseholdId } from "@/lib/household";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const householdId = userId ? await getHouseholdId(userId) : null;

  return (
    <MonthProvider>
    <ChatProvider>
      <div className="flex flex-col min-h-screen">
        <header className="w-full flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900">
          <NavLinks />
          <AccountButton />
        </header>
        <MonthBar />
        <main className="flex-1 flex flex-col px-4 py-6 max-w-2xl lg:max-w-5xl mx-auto w-full overflow-x-hidden">
          <HouseholdGate hasHousehold={!!householdId}>
            {children}
          </HouseholdGate>
        </main>
      </div>
    </ChatProvider>
    </MonthProvider>
  );
}

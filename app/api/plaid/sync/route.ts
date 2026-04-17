import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { getHouseholdId } from "@/lib/household";
import sql from "@/lib/db";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "No household" }, { status: 400 });

  const items = await sql<{ plaid_item_id: string; plaid_access_token: string }[]>`
    SELECT plaid_item_id, plaid_access_token FROM plaid_items WHERE household_id = ${householdId}
  `;

  let synced = 0;
  for (const item of items) {
    const balanceResponse = await plaidClient.accountsBalanceGet({ access_token: item.plaid_access_token });

    for (const acct of balanceResponse.data.accounts) {
      const current = acct.balances.current ?? null;
      const available = acct.balances.available ?? null;

      await sql`
        INSERT INTO plaid_balances (household_id, plaid_account_id, current_balance, available_balance)
        VALUES (${householdId}, ${acct.account_id}, ${current}, ${available})
      `;

      await sql`
        UPDATE plaid_accounts SET current_balance = ${current}, available_balance = ${available}, updated_at = NOW()
        WHERE plaid_account_id = ${acct.account_id}
      `;

      synced++;
    }
  }

  return NextResponse.json({ ok: true, accounts_synced: synced });
}

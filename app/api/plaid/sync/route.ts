import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { getHouseholdId } from "@/lib/household";
import { decrypt } from "@/lib/encrypt";
import sql from "@/lib/db";
import { PlaidError } from "plaid";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "No household" }, { status: 400 });

  // Rate limit: 5 syncs per 15-minute window per household
  const WINDOW_MS  = 15 * 60 * 1000;
  const SYNC_LIMIT = 5;
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM plaid_sync_log
    WHERE household_id = ${householdId} AND synced_at > ${windowStart}
  `;
  if (count >= SYNC_LIMIT) {
    return NextResponse.json(
      { error: "Too many syncs", retry_after_minutes: 15 },
      { status: 429 }
    );
  }

  const items = await sql<{ plaid_item_id: string; plaid_access_token: string }[]>`
    SELECT plaid_item_id, plaid_access_token FROM plaid_items WHERE household_id = ${householdId}
  `;

  let synced = 0;
  const errors: { institution: string; error: string }[] = [];

  for (const item of items) {
    try {
      const balanceResponse = await plaidClient.accountsBalanceGet({ access_token: decrypt(item.plaid_access_token) });

      // Clear any previous error now that sync succeeded
      await sql`UPDATE plaid_items SET error_code = NULL WHERE plaid_item_id = ${item.plaid_item_id}`;

      for (const acct of balanceResponse.data.accounts) {
        const current   = acct.balances.current ?? null;
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
    } catch (err: unknown) {
      const plaidErr = (err as { response?: { data?: PlaidError } }).response?.data;
      const code = plaidErr?.error_code ?? "UNKNOWN_ERROR";

      // Persist the error so the UI can prompt re-auth
      await sql`UPDATE plaid_items SET error_code = ${code} WHERE plaid_item_id = ${item.plaid_item_id}`;

      const [{ institution_name }] = await sql<[{ institution_name: string }]>`
        SELECT institution_name FROM plaid_items WHERE plaid_item_id = ${item.plaid_item_id}
      `;
      errors.push({ institution: institution_name, error: code });
    }
  }

  // Log this sync and clean up entries older than the window
  await sql`INSERT INTO plaid_sync_log (household_id) VALUES (${householdId})`;
  sql`DELETE FROM plaid_sync_log WHERE synced_at < NOW() - INTERVAL '15 minutes'`.catch(() => {});

  return NextResponse.json({ ok: true, accounts_synced: synced, errors });
}

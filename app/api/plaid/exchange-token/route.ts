import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { getHouseholdId } from "@/lib/household";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "No household" }, { status: 400 });

  const { public_token, institution_id, institution_name } = await req.json();

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
  const { access_token, item_id } = exchangeResponse.data;

  // Fetch accounts from Plaid to store metadata
  const accountsResponse = await plaidClient.accountsGet({ access_token });
  const accounts = accountsResponse.data.accounts;

  // Upsert the item (institution connection)
  await sql`
    INSERT INTO plaid_items (household_id, plaid_item_id, plaid_access_token, institution_id, institution_name)
    VALUES (${householdId}, ${item_id}, ${access_token}, ${institution_id}, ${institution_name})
    ON CONFLICT (plaid_item_id) DO UPDATE
      SET plaid_access_token = EXCLUDED.plaid_access_token,
          institution_name   = EXCLUDED.institution_name,
          updated_at         = NOW()
  `;

  // Upsert each account
  for (const acct of accounts) {
    await sql`
      INSERT INTO plaid_accounts (
        household_id, plaid_item_id, plaid_account_id,
        name, official_name, type, subtype, mask
      ) VALUES (
        ${householdId}, ${item_id}, ${acct.account_id},
        ${acct.name}, ${acct.official_name ?? null},
        ${acct.type}, ${acct.subtype ?? null}, ${acct.mask ?? null}
      )
      ON CONFLICT (plaid_account_id) DO UPDATE
        SET name          = EXCLUDED.name,
            official_name = EXCLUDED.official_name,
            subtype       = EXCLUDED.subtype,
            updated_at    = NOW()
    `;
  }

  // Trigger an initial balance sync
  await syncBalances(householdId, item_id, access_token, accounts.map((a) => a.account_id));

  return NextResponse.json({ ok: true, account_count: accounts.length });
}

async function syncBalances(
  householdId: string,
  itemId: string,
  accessToken: string,
  accountIds: string[]
) {
  const balanceResponse = await plaidClient.accountsBalanceGet({ access_token: accessToken });

  for (const acct of balanceResponse.data.accounts) {
    if (!accountIds.includes(acct.account_id)) continue;
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
  }
}

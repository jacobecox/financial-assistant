import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { CountryCode } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { getHouseholdId } from "@/lib/household";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "No household" }, { status: 400 });

  const { plaid_item_id } = await req.json();

  const rows = await sql<[{ plaid_access_token: string }]>`
    SELECT plaid_access_token FROM plaid_items
    WHERE plaid_item_id = ${plaid_item_id} AND household_id = ${householdId}
  `;
  if (!rows.length) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  // Update mode: pass access_token instead of products — re-auths the existing item
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "PayClarity",
    access_token: rows[0].plaid_access_token,
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return NextResponse.json({ link_token: response.data.link_token });
}

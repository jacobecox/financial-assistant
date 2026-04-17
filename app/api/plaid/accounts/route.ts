import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getHouseholdId } from "@/lib/household";
import sql from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "No household" }, { status: 400 });

  const accounts = await sql`
    SELECT
      a.plaid_account_id,
      a.name,
      a.official_name,
      a.type,
      a.subtype,
      a.mask,
      a.current_balance,
      a.available_balance,
      a.updated_at,
      i.institution_name,
      i.institution_id,
      i.plaid_item_id
    FROM plaid_accounts a
    JOIN plaid_items i ON i.plaid_item_id = a.plaid_item_id
    WHERE a.household_id = ${householdId}
    ORDER BY i.institution_name, a.name
  `;

  return NextResponse.json({ accounts });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "No household" }, { status: 400 });

  const { plaid_item_id } = await req.json();

  await sql`
    DELETE FROM plaid_items WHERE plaid_item_id = ${plaid_item_id} AND household_id = ${householdId}
  `;

  return NextResponse.json({ ok: true });
}

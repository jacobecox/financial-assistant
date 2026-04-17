import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getHouseholdId } from "@/lib/household";
import sql from "@/lib/db";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "No household" }, { status: 400 });

  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // For each day, sum the most recent balance per account
  const rows = await sql<{ date: string; net_worth: number }[]>`
    WITH daily AS (
      SELECT
        DATE(synced_at AT TIME ZONE 'UTC') AS date,
        plaid_account_id,
        current_balance,
        ROW_NUMBER() OVER (
          PARTITION BY DATE(synced_at AT TIME ZONE 'UTC'), plaid_account_id
          ORDER BY synced_at DESC
        ) AS rn
      FROM plaid_balances
      WHERE household_id = ${householdId}
        AND synced_at >= ${since}
    )
    SELECT date::text, SUM(current_balance)::float AS net_worth
    FROM daily
    WHERE rn = 1
    GROUP BY date
    ORDER BY date ASC
  `;

  return NextResponse.json({ history: rows });
}

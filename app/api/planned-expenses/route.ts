import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getHouseholdId } from "@/lib/household";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const year  = searchParams.get("year");
  const month = searchParams.get("month"); // 0-indexed from client

  if (year && month !== null) {
    const m = Number(month) + 1;
    const rows = await sql`
      SELECT * FROM planned_expenses
      WHERE household_id = ${householdId}
        AND active = true
        AND EXTRACT(year  FROM planned_date) = ${Number(year)}
        AND EXTRACT(month FROM planned_date) = ${m}
      ORDER BY planned_date ASC
    `;
    return NextResponse.json(rows);
  }

  const rows = await sql`
    SELECT * FROM planned_expenses
    WHERE household_id = ${householdId} AND active = true
    ORDER BY planned_date ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const { name, amount, planned_date, notes } = await req.json();

  const [row] = await sql`
    INSERT INTO planned_expenses (user_id, household_id, name, amount, planned_date, notes)
    VALUES (${userId}, ${householdId}, ${name}, ${amount}, ${planned_date}, ${notes ?? null})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}

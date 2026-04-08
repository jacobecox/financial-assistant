import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year  = searchParams.get("year");
  const month = searchParams.get("month"); // 0-indexed from client

  if (year && month !== null) {
    // Filter to a specific month (month param is 0-indexed)
    const m = Number(month) + 1; // convert to 1-indexed for SQL
    const rows = await sql`
      SELECT * FROM planned_expenses
      WHERE user_id = ${userId}
        AND active = true
        AND EXTRACT(year  FROM planned_date) = ${Number(year)}
        AND EXTRACT(month FROM planned_date) = ${m}
      ORDER BY planned_date ASC
    `;
    return NextResponse.json(rows);
  }

  // All active planned expenses
  const rows = await sql`
    SELECT * FROM planned_expenses
    WHERE user_id = ${userId} AND active = true
    ORDER BY planned_date ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, amount, planned_date, notes } = await req.json();

  const [row] = await sql`
    INSERT INTO planned_expenses (user_id, name, amount, planned_date, notes)
    VALUES (${userId}, ${name}, ${amount}, ${planned_date}, ${notes ?? null})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}

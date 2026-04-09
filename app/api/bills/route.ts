import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getHouseholdId } from "@/lib/household";
import type { BillInput } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  try {
    const bills = await sql`
      SELECT * FROM bills
      WHERE household_id = ${householdId} AND active = true
      ORDER BY sort_order ASC, created_at ASC
    `;
    return NextResponse.json(bills);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const body: BillInput = await req.json();

  try {
    const [bill] = await sql`
      INSERT INTO bills (user_id, household_id, name, amount, category, frequency, due_day, due_day_2, anchor_date, recurring, active)
      VALUES (
        ${userId},
        ${householdId},
        ${body.name},
        ${body.amount},
        ${body.category ?? null},
        ${body.frequency ?? "monthly"},
        ${body.due_day ?? null},
        ${body.due_day_2 ?? null},
        ${body.anchor_date ?? null},
        ${body.recurring ?? true},
        true
      )
      RETURNING *
    `;
    return NextResponse.json(bill, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

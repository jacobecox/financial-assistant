import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getHouseholdId } from "@/lib/household";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  try {
    const items = await sql`
      SELECT * FROM discretionary_items
      WHERE household_id = ${householdId} AND active = true
      ORDER BY created_at ASC
    `;
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const body: { name: string; amount: number; frequency?: string } = await req.json();

  try {
    const [item] = await sql`
      INSERT INTO discretionary_items (user_id, household_id, name, amount, frequency)
      VALUES (${userId}, ${householdId}, ${body.name}, ${body.amount}, ${body.frequency ?? "monthly"})
      RETURNING *
    `;
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

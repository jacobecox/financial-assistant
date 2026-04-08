import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import type { BillInput } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const bills = await sql`
      SELECT * FROM bills
      WHERE user_id = ${userId} AND active = true
      ORDER BY due_day ASC
    `;
    return NextResponse.json(bills);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: BillInput = await req.json();

  try {
    const [bill] = await sql`
      INSERT INTO bills (user_id, name, amount, due_day, recurring, active)
      VALUES (${userId}, ${body.name}, ${body.amount}, ${body.due_day}, ${body.recurring ?? true}, true)
      RETURNING *
    `;
    return NextResponse.json(bill, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import type { PaycheckInput } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [paycheck] = await sql`
      SELECT * FROM paychecks
      WHERE user_id = ${userId}
      ORDER BY pay_date DESC
      LIMIT 1
    `;
    return NextResponse.json(paycheck ?? null);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: PaycheckInput = await req.json();

  try {
    const [paycheck] = await sql`
      INSERT INTO paychecks (user_id, amount, pay_date, next_pay_date)
      VALUES (${userId}, ${body.amount}, ${body.pay_date}, ${body.next_pay_date})
      RETURNING *
    `;
    return NextResponse.json(paycheck, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

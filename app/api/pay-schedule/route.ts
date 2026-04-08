import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { computePayDates, type PaySchedule } from "@/lib/pay-schedule";
import type { PayScheduleInput } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const schedules = await sql<PaySchedule[]>`
      SELECT * FROM pay_schedules WHERE user_id = ${userId} ORDER BY created_at ASC
    `;

    return NextResponse.json(
      schedules.map((s) => ({ ...s, ...computePayDates(s) }))
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: PayScheduleInput = await req.json();

  try {
    const [schedule] = await sql<PaySchedule[]>`
      INSERT INTO pay_schedules (user_id, name, amount, frequency, anchor_date, pay_day_1, pay_day_2, end_date)
      VALUES (
        ${userId},
        ${body.name},
        ${body.amount},
        ${body.frequency},
        ${body.anchor_date},
        ${body.pay_day_1 ?? null},
        ${body.pay_day_2 ?? null},
        ${(body as Record<string, unknown>).end_date ?? null}
      )
      RETURNING *
    `;

    return NextResponse.json({ ...schedule, ...computePayDates(schedule) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

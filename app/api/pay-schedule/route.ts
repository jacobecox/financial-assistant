import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getHouseholdId } from "@/lib/household";
import { computePayDates, type PaySchedule } from "@/lib/pay-schedule";
import type { PayScheduleInput } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  try {
    const schedules = (await sql`
      SELECT * FROM pay_schedules WHERE household_id = ${householdId} ORDER BY created_at ASC
    `) as unknown as PaySchedule[];
    return NextResponse.json(schedules.map((s) => ({ ...s, ...computePayDates(s) })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const body: PayScheduleInput = await req.json();

  try {
    const [schedule] = (await sql`
      INSERT INTO pay_schedules (user_id, household_id, name, amount, frequency, anchor_date, pay_day_1, pay_day_2, end_date)
      VALUES (
        ${userId},
        ${householdId},
        ${body.name},
        ${body.amount},
        ${body.frequency},
        ${body.anchor_date},
        ${body.pay_day_1 ?? null},
        ${body.pay_day_2 ?? null},
        ${body.end_date ?? null}
      )
      RETURNING *
    `) as unknown as PaySchedule[];
    return NextResponse.json({ ...schedule, ...computePayDates(schedule) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

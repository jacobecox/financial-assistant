import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getHouseholdId } from "@/lib/household";
import { computePayDates, type PaySchedule } from "@/lib/pay-schedule";
import type { PayScheduleInput } from "@/lib/types";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const { id } = await params;
  const body: PayScheduleInput = await req.json();

  try {
    const [schedule] = await sql<PaySchedule[]>`
      UPDATE pay_schedules SET
        name        = ${body.name},
        amount      = ${body.amount},
        frequency   = ${body.frequency},
        anchor_date = ${body.anchor_date},
        pay_day_1   = ${body.pay_day_1 ?? null},
        pay_day_2   = ${body.pay_day_2 ?? null},
        end_date    = ${(body as Record<string, unknown>).end_date ?? null},
        updated_at  = now()
      WHERE id = ${id}::uuid AND household_id = ${householdId}
      RETURNING *
    `;
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...schedule, ...computePayDates(schedule) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const { id } = await params;

  try {
    await sql`DELETE FROM pay_schedules WHERE id = ${id}::uuid AND household_id = ${householdId}`;
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

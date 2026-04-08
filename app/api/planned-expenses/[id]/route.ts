import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, amount, planned_date, notes } = await req.json();

  const [row] = await sql`
    UPDATE planned_expenses
    SET name = ${name}, amount = ${amount}, planned_date = ${planned_date}, notes = ${notes ?? null}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await sql`
    UPDATE planned_expenses SET active = false
    WHERE id = ${id} AND user_id = ${userId}
  `;
  return NextResponse.json({ ok: true });
}

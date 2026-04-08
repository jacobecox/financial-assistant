import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import type { BillInput } from "@/lib/types";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body: Partial<BillInput> = await req.json();

  // Build update object from only the fields that were sent
  const fields: Record<string, unknown> = {};
  if (body.name !== undefined) fields.name = body.name;
  if (body.amount !== undefined) fields.amount = body.amount;
  if (body.due_day !== undefined) fields.due_day = body.due_day;
  if (body.recurring !== undefined) fields.recurring = body.recurring;

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const [bill] = await sql`
      UPDATE bills
      SET ${sql(fields)}
      WHERE id = ${id}::uuid AND user_id = ${userId}
      RETURNING *
    `;
    if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(bill);
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

  const { id } = await params;

  try {
    // Soft-delete by setting active = false
    await sql`
      UPDATE bills SET active = false
      WHERE id = ${id}::uuid AND user_id = ${userId}
    `;
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

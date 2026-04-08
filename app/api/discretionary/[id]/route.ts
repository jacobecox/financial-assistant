import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body: { name?: string; amount?: number; frequency?: string } = await req.json();

  const fields: Record<string, unknown> = {};
  if (body.name      !== undefined) fields.name      = body.name;
  if (body.amount    !== undefined) fields.amount    = body.amount;
  if (body.frequency !== undefined) fields.frequency = body.frequency;

  if (Object.keys(fields).length === 0)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  try {
    const [item] = await sql`
      UPDATE discretionary_items SET ${sql(fields)}
      WHERE id = ${id}::uuid AND user_id = ${userId}
      RETURNING *
    `;
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
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
    await sql`UPDATE discretionary_items SET active = false WHERE id = ${id}::uuid AND user_id = ${userId}`;
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

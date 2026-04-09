import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getHouseholdId } from "@/lib/household";

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const body: { id: string; sort_order: number }[] = await req.json();

  try {
    await sql.begin(async (tx) => {
      for (const { id, sort_order } of body) {
        await tx`
          UPDATE bills SET sort_order = ${sort_order}
          WHERE id = ${id}::uuid AND household_id = ${householdId}
        `;
      }
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

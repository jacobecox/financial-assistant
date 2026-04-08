import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import type { IncomeInput } from "@/lib/types";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since"); // optional ISO date filter

  try {
    const entries = since
      ? await sql`
          SELECT * FROM income
          WHERE user_id = ${userId} AND date >= ${since}::date
          ORDER BY date DESC, created_at DESC
        `
      : await sql`
          SELECT * FROM income
          WHERE user_id = ${userId}
          ORDER BY date DESC, created_at DESC
          LIMIT 50
        `;

    return NextResponse.json(entries);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: IncomeInput = await req.json();

  try {
    const [entry] = await sql`
      INSERT INTO income (user_id, amount, source, date, notes)
      VALUES (${userId}, ${body.amount}, ${body.source}, ${body.date}, ${body.notes ?? null})
      RETURNING *
    `;
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

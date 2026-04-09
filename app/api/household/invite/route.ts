import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getHouseholdId } from "@/lib/household";

// POST — generate a 24-hour invite token for the current household
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const token = crypto.randomUUID();

  await sql`
    INSERT INTO household_invites (token, household_id, created_by, expires_at)
    VALUES (${token}, ${householdId}, ${userId}, now() + interval '24 hours')
  `;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({ token, url: `${appUrl}/join?token=${token}` });
}

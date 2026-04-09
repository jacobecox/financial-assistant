import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getHouseholdId, invalidateHouseholdCache } from "@/lib/household";

// POST — accept an invite and join the household
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  // Validate the token
  const [invite] = await sql<{
    household_id: string;
    expires_at: string;
    used_at: string | null;
  }[]>`
    SELECT household_id, expires_at, used_at
    FROM household_invites WHERE token = ${token}
  `;

  if (!invite) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (invite.used_at) return NextResponse.json({ error: "already_used" }, { status: 409 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "expired" }, { status: 410 });

  // Check the user isn't already in a household
  const existing = await getHouseholdId(userId);
  if (existing) return NextResponse.json({ error: "already_in_household" }, { status: 409 });

  // Join the household and mark the invite as used
  await sql`
    WITH join_household AS (
      INSERT INTO household_members (user_id, household_id, role)
      VALUES (${userId}, ${invite.household_id}, 'member')
    )
    UPDATE household_invites
    SET used_at = now(), used_by = ${userId}
    WHERE token = ${token}
  `;

  invalidateHouseholdCache(userId);
  return NextResponse.json({ ok: true, householdId: invite.household_id });
}

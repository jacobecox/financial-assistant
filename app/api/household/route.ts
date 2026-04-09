import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getHouseholdId, invalidateHouseholdCache } from "@/lib/household";

// GET — fetch current household + members
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = await getHouseholdId(userId);
  if (!householdId) return NextResponse.json({ error: "no_household" }, { status: 404 });

  const [household] = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM households WHERE id = ${householdId}
  `;

  const members = await sql<{ user_id: string; role: string; joined_at: string }[]>`
    SELECT user_id, role, joined_at FROM household_members WHERE household_id = ${householdId}
  `;

  const client = await clerkClient();
  const enriched = await Promise.all(
    members.map(async (m) => {
      try {
        const u = await client.users.getUser(m.user_id);
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || null;
        const email = u.emailAddresses[0]?.emailAddress ?? null;
        return { ...m, name, email };
      } catch {
        return { ...m, name: null, email: null };
      }
    })
  );

  return NextResponse.json({ household, members: enriched });
}

// POST — create a new household (for users with none)
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getHouseholdId(userId);
  if (existing) return NextResponse.json({ error: "already_in_household" }, { status: 409 });

  const { name = "My Household" } = await req.json().catch(() => ({}));

  const [household] = await sql<{ id: string }[]>`
    WITH h AS (
      INSERT INTO households (name) VALUES (${name}) RETURNING id
    )
    INSERT INTO household_members (user_id, household_id, role)
    SELECT ${userId}, id, 'owner' FROM h
    RETURNING household_id AS id
  `;

  invalidateHouseholdCache(userId);
  return NextResponse.json({ householdId: household.id }, { status: 201 });
}

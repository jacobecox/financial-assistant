import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET — public preview of an invite token (no auth required)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const [row] = await sql<{
    household_id: string;
    household_name: string;
    expires_at: string;
    used_at: string | null;
  }[]>`
    SELECT hi.household_id, h.name AS household_name, hi.expires_at, hi.used_at
    FROM household_invites hi
    JOIN households h ON h.id = hi.household_id
    WHERE hi.token = ${token}
  `;

  if (!row) return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
  if (row.used_at) return NextResponse.json({ valid: false, reason: "already_used" });
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ valid: false, reason: "expired" });

  return NextResponse.json({
    valid: true,
    householdId: row.household_id,
    householdName: row.household_name,
    expiresAt: row.expires_at,
  });
}

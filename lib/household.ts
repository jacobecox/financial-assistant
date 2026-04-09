import sql from "@/lib/db";

// Process-level cache: userId -> householdId
// Safe for a single-container deployment. Busted explicitly on join/leave.
const cache = new Map<string, string>();

export async function getHouseholdId(userId: string): Promise<string | null> {
  const cached = cache.get(userId);
  if (cached) return cached;

  const [row] = (await sql`
    SELECT household_id FROM household_members WHERE user_id = ${userId}
  `) as unknown as { household_id: string }[];

  if (!row) return null;
  cache.set(userId, row.household_id);
  return row.household_id;
}

export function invalidateHouseholdCache(userId: string) {
  cache.delete(userId);
}

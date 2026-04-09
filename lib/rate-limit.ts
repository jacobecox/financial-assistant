import sql from "@/lib/db";

const DAILY_LIMIT = 20;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in ms

// Create the table once per process — idempotent so it's safe to re-run
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS chat_rate_limits (
      id        BIGSERIAL PRIMARY KEY,
      user_id   TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_user_created
      ON chat_rate_limits (user_id, created_at)
  `;
  tableReady = true;
}

export interface RateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date; // when the oldest request in the window expires
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  await ensureTable();

  const windowStart = new Date(Date.now() - WINDOW_MS);

  // Count how many requests this user has made in the rolling window
  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count
    FROM chat_rate_limits
    WHERE user_id   = ${userId}
      AND created_at > ${windowStart}
  `;

  const used = count;

  // When does the oldest in-window request age out?
  const oldest = await sql<{ created_at: Date }[]>`
    SELECT created_at
    FROM chat_rate_limits
    WHERE user_id   = ${userId}
      AND created_at > ${windowStart}
    ORDER BY created_at ASC
    LIMIT 1
  `;
  const resetAt = oldest.length
    ? new Date(oldest[0].created_at.getTime() + WINDOW_MS)
    : new Date(Date.now() + WINDOW_MS);

  if (used >= DAILY_LIMIT) {
    return { allowed: false, used, limit: DAILY_LIMIT, remaining: 0, resetAt };
  }

  // Record this request
  await sql`INSERT INTO chat_rate_limits (user_id) VALUES (${userId})`;

  // Purge entries older than 48 h — fire-and-forget, never blocks the response
  sql`DELETE FROM chat_rate_limits WHERE created_at < NOW() - INTERVAL '48 hours'`.catch(
    () => {}
  );

  return {
    allowed: true,
    used: used + 1,
    limit: DAILY_LIMIT,
    remaining: DAILY_LIMIT - (used + 1),
    resetAt,
  };
}

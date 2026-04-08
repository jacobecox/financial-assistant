import postgres from "postgres";

// Singleton connection pool — reused across requests in the same Node.js process.
// In production the DATABASE_URL points to the Control Plane postgres workload
// via its internal hostname (e.g. postgresql://user:pass@postgres.cpln.local:5432/finance).
const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export default sql;

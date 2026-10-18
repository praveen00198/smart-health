import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Resolves the database connection string.
 *
 * Direct Supabase connections (`db.<ref>.supabase.co:5432`) resolve only to IPv6 addresses.
 * Serverless platforms (such as AWS Lambda on Vercel) lack IPv6 egress, causing direct
 * connections to fail with connection timeouts/errors.
 *
 * When a direct `db.<ref>.supabase.co` URL is detected, this automatically translates
 * it to the Supabase connection pooler endpoint (`aws-0-<region>.pooler.supabase.com:6543`)
 * with the required `<username>.<ref>` format, providing full IPv4 connectivity and serverless
 * connection pooling.
 */
function resolveConnectionString(): string | undefined {
  const rawUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!rawUrl) return undefined;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname;

    // Detect direct Supabase IPv6-only pattern: db.<project-ref>.supabase.co
    const match = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (match) {
      const ref = match[1];
      const username = parsed.username || "postgres";
      const poolerUser = username.includes(".") ? username : `${username}.${ref}`;

      const region = process.env.SUPABASE_REGION || process.env.POOLER_REGION || "ap-south-1";
      const poolerHost = `aws-0-${region}.pooler.supabase.com`;
      const port = process.env.SUPABASE_POOLER_PORT || "6543";

      const resolved = new URL(rawUrl);
      resolved.hostname = poolerHost;
      resolved.port = port;
      resolved.username = poolerUser;

      return resolved.toString();
    }
  } catch {
    // Return raw URL if parsing fails
  }

  return rawUrl;
}

const connectionString = resolveConnectionString();

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

function getOrCreateClient(connStr: string) {
  if (!globalForDb.conn) {
    globalForDb.conn = postgres(connStr, {
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return globalForDb.conn;
}

// Lazy initialization or singleton connection pool to avoid connection exhaustion in Next.js
export function getDb() {
  if (!connectionString) {
    throw new Error("DATABASE_URL or SUPABASE_DB_URL environment variable is not defined.");
  }

  const conn = getOrCreateClient(connectionString);
  return drizzle(conn);
}

export const db = connectionString
  ? drizzle(getOrCreateClient(connectionString))
  : (null as unknown as ReturnType<typeof drizzle>);


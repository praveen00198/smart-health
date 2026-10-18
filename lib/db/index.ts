import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Lazy initialization or singleton connection pool to avoid connection exhaustion in Next.js
export function getDb() {
  if (!connectionString) {
    throw new Error("DATABASE_URL or SUPABASE_DB_URL environment variable is not defined.");
  }

  const conn = globalForDb.conn ?? postgres(connectionString, { prepare: false });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.conn = conn;
  }

  return drizzle(conn);
}

export const db = connectionString
  ? drizzle(globalForDb.conn ?? postgres(connectionString, { prepare: false }))
  : (null as unknown as ReturnType<typeof drizzle>);

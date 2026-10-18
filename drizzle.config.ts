import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.warn("Warning: DATABASE_URL / SUPABASE_DB_URL is not set.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./supabase/migrations",
  dbCredentials: {
    url: connectionString || "",
  },
});

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("FAILED: Neither DATABASE_URL nor SUPABASE_DB_URL is set in .env.local.");
  process.exit(1);
}

// Sanitize URL for logging (strip password)
const sanitized = dbUrl.replace(/:([^:@]+)@/, ":****@");
console.log(`Testing read-only connection to: ${sanitized}`);

const sql = postgres(dbUrl, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

async function testConnection() {
  try {
    const result = await sql`SELECT current_database() AS db_name, version() AS pg_version;`;
    console.log("SUCCESS: Connected to PostgreSQL database successfully.");
    console.log(`Database name: ${result[0].db_name}`);
    console.log(`PostgreSQL version: ${result[0].pg_version.split(",")[0]}`);
    process.exit(0);
  } catch (err) {
    console.error("CONNECTION FAILED:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

testConnection();

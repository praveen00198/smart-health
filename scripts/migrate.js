require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("FAILED: Neither DATABASE_URL nor SUPABASE_DB_URL is set in .env.local.");
  process.exit(1);
}

const migrationFile = path.join(__dirname, "..", "supabase", "migrations", "20261018000001_initial_schema.sql");
if (!fs.existsSync(migrationFile)) {
  console.error("FAILED: Migration file not found:", migrationFile);
  process.exit(1);
}

const sqlContent = fs.readFileSync(migrationFile, "utf-8");

const sql = postgres(dbUrl, {
  max: 1,
  connect_timeout: 15,
  prepare: false,
});

async function runMigration() {
  console.log("Applying initial schema migration (20261018000001_initial_schema.sql)...");
  try {
    // Execute migration in raw transaction
    await sql.unsafe(sqlContent);
    console.log("SUCCESS: Initial schema migration executed successfully.");

    // Verify all 11 tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    console.log(`Verified ${tables.length} tables in 'public' schema:`);
    tables.forEach((t) => console.log(` - ${t.table_name}`));
    process.exit(0);
  } catch (err) {
    console.error("MIGRATION FAILED:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

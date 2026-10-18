require("dotenv").config({ path: ".env.local" });
const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const { sql } = require("drizzle-orm");

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const client = postgres(dbUrl, { max: 1, prepare: false });
const db = drizzle(client);

async function testHealth() {
  try {
    const [
      facilities,
      medicines,
      stock,
      consumption,
      facilityDaily,
      tests,
      alerts,
      transfers,
      notifications,
    ] = await Promise.all([
      db.execute(sql`SELECT count(*)::int AS count FROM facilities`),
      db.execute(sql`SELECT count(*)::int AS count FROM medicines`),
      db.execute(sql`SELECT count(*)::int AS count FROM stock`),
      db.execute(sql`SELECT count(*)::int AS count FROM consumption_daily`),
      db.execute(sql`SELECT count(*)::int AS count FROM facility_daily`),
      db.execute(sql`SELECT count(*)::int AS count FROM test_availability`),
      db.execute(sql`SELECT count(*)::int AS count FROM alerts`),
      db.execute(sql`SELECT count(*)::int AS count FROM transfer_proposals`),
      db.execute(sql`SELECT count(*)::int AS count FROM notifications`),
    ]);

    const result = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      orm: "drizzle-orm",
      counts: {
        facilities: facilities[0].count,
        medicines: medicines[0].count,
        stockRows: stock[0].count,
        consumptionHistoryRows: consumption[0].count,
        facilityDailyRows: facilityDaily[0].count,
        testAvailabilityRows: tests[0].count,
        alerts: alerts[0].count,
        transferProposals: transfers[0].count,
        notifications: notifications[0].count,
      },
    };

    console.log("HEALTH CHECK RESPONSE:");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Health check error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testHealth();

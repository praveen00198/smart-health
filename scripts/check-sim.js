require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const client = postgres(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL, { max: 1 });

async function check() {
  const fac = await client`SELECT id, name FROM facilities WHERE name ILIKE '%Rampur%'`;
  const med = await client`SELECT id, name FROM medicines WHERE name ILIKE '%ORS%'`;
  const devgarh = await client`SELECT id, name FROM facilities WHERE name ILIKE '%Devgarh%'`;
  const st = await client`SELECT * FROM stock WHERE facility_id = ${fac[0].id} AND medicine_id = ${med[0].id}`;
  const stDev = await client`SELECT * FROM stock WHERE facility_id = ${devgarh[0].id} AND medicine_id = ${med[0].id}`;
  
  console.log("Rampur:", fac[0]);
  console.log("Devgarh:", devgarh[0]);
  console.log("ORS:", med[0]);
  console.log("Rampur Stock:", st);
  console.log("Devgarh Stock:", stDev);
  await client.end();
}
check();

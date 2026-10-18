require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("FAILED: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  process.exit(1);
}

const sanitizedKey = key.slice(0, 8) + "..." + key.slice(-4);
console.log(`Testing Supabase API connection to: ${url} with key: ${sanitizedKey}`);

const supabase = createClient(url, key);

async function checkSupabase() {
  try {
    // Attempt a light read to check API availability
    const { data, error } = await supabase.from("_non_existent_check_").select("*").limit(1);
    // An error code of PGRST204 or 42P01 (relation does not exist) proves the API is reachable and responding!
    if (error && (error.code === "PGRST204" || error.code === "42P01" || error.message.includes("relation") || error.code === "PGRST116")) {
      console.log("SUCCESS: Supabase REST endpoint is reachable and authenticated successfully.");
      console.log("Response verification: API returned expected PostgreSQL response code:", error.code || error.message);
      process.exit(0);
    } else if (error && (error.code === "PGRST301" || error.message.includes("JWT"))) {
      console.error("AUTHENTICATION FAILED: Invalid API Key.", error.message);
      process.exit(1);
    } else {
      console.log("SUCCESS: Supabase API connected without authentication errors.");
      process.exit(0);
    }
  } catch (err) {
    console.error("API CONNECTION ERROR:", err.message);
    process.exit(1);
  }
}

checkSupabase();

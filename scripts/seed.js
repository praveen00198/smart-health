require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("FAILED: Neither DATABASE_URL nor SUPABASE_DB_URL is set in .env.local.");
  process.exit(1);
}

const sql = postgres(dbUrl, {
  max: 2,
  connect_timeout: 20,
  prepare: false,
});

// Deterministic PRNG (Mulberry32) for reproducible data generation
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const facilitiesData = [
  { id: "11111111-1111-4111-a111-000000000001", name: "PHC Rampur", type: "PHC", block: "Sehore", district: "Sehore", lat: 23.2012, lng: 77.0851, catchment: 22000, doctors: 1, beds: 6 },
  { id: "11111111-1111-4111-a111-000000000002", name: "CHC Devgarh", type: "CHC", block: "Sehore", district: "Sehore", lat: 23.2354, lng: 77.1425, catchment: 65000, doctors: 4, beds: 30 },
  { id: "11111111-1111-4111-a111-000000000003", name: "PHC Khejra", type: "PHC", block: "Ichhawar", district: "Sehore", lat: 23.0125, lng: 77.0182, catchment: 18000, doctors: 1, beds: 4 },
  { id: "11111111-1111-4111-a111-000000000004", name: "PHC Bilkisganj", type: "PHC", block: "Sehore", district: "Sehore", lat: 23.1450, lng: 77.2104, catchment: 25000, doctors: 2, beds: 6 },
  { id: "11111111-1111-4111-a111-000000000005", name: "CHC Ashta", type: "CHC", block: "Ashta", district: "Sehore", lat: 23.0192, lng: 76.5341, catchment: 80000, doctors: 5, beds: 50 },
  { id: "11111111-1111-4111-a111-000000000006", name: "PHC Shyampur", type: "PHC", block: "Shyampur", district: "Sehore", lat: 23.4125, lng: 77.1023, catchment: 28000, doctors: 2, beds: 6 },
  { id: "11111111-1111-4111-a111-000000000007", name: "PHC Doraha", type: "PHC", block: "Shyampur", district: "Sehore", lat: 23.3541, lng: 77.2514, catchment: 19000, doctors: 1, beds: 4 },
  { id: "11111111-1111-4111-a111-000000000008", name: "CHC Ichhawar", type: "CHC", block: "Ichhawar", district: "Sehore", lat: 23.0314, lng: 77.0256, catchment: 55000, doctors: 3, beds: 30 },
  { id: "11111111-1111-4111-a111-000000000009", name: "PHC Jawar", type: "PHC", block: "Ashta", district: "Sehore", lat: 23.0552, lng: 76.4152, catchment: 21000, doctors: 1, beds: 4 },
  { id: "11111111-1111-4111-a111-000000000010", name: "PHC Rehti", type: "PHC", block: "Budhni", district: "Sehore", lat: 22.7351, lng: 77.4321, catchment: 24000, doctors: 1, beds: 6 },
];

const medicinesData = [
  { id: "22222222-2222-4222-b222-000000000001", name: "Oral Rehydration Salts (ORS)", category: "Essential Fluids", criticality: 2, unit: "sachet", leadTime: 7 },
  { id: "22222222-2222-4222-b222-000000000002", name: "Anti-Snake Venom (ASV)", category: "Antidotes / Emergency", criticality: 3, unit: "vial", leadTime: 14 },
  { id: "22222222-2222-4222-b222-000000000003", name: "Paracetamol 500mg", category: "Analgesics & Antipyretics", criticality: 1, unit: "tablet", leadTime: 5 },
  { id: "22222222-2222-4222-b222-000000000004", name: "Amoxicillin 500mg", category: "Antibiotics", criticality: 2, unit: "capsule", leadTime: 7 },
  { id: "22222222-2222-4222-b222-000000000005", name: "Metformin 500mg", category: "NCD / Antidiabetic", criticality: 1, unit: "tablet", leadTime: 10 },
  { id: "22222222-2222-4222-b222-000000000006", name: "Amlodipine 5mg", category: "NCD / Antihypertensive", criticality: 1, unit: "tablet", leadTime: 10 },
  { id: "22222222-2222-4222-b222-000000000007", name: "Iron Folic Acid (IFA)", category: "Maternal & Child Health", criticality: 1, unit: "tablet", leadTime: 7 },
  { id: "22222222-2222-4222-b222-000000000008", name: "Albendazole 400mg", category: "Anthelmintic", criticality: 1, unit: "tablet", leadTime: 7 },
  { id: "22222222-2222-4222-b222-000000000009", name: "Ciprofloxacin 500mg", category: "Antibiotics", criticality: 2, unit: "tablet", leadTime: 7 },
  { id: "22222222-2222-4222-b222-000000000010", name: "Azithromycin 500mg", category: "Antibiotics", criticality: 2, unit: "tablet", leadTime: 7 },
  { id: "22222222-2222-4222-b222-000000000011", name: "Oxytocin 10 IU", category: "Maternal Health Emergency", criticality: 3, unit: "ampoule", leadTime: 10 },
  { id: "22222222-2222-4222-b222-000000000012", name: "Artemether-Lumefantrine", category: "Antimalarial", criticality: 3, unit: "tablet", leadTime: 14 },
  { id: "22222222-2222-4222-b222-000000000013", name: "Salbutamol Inhaler 100mcg", category: "Respiratory", criticality: 2, unit: "inhaler", leadTime: 10 },
  { id: "22222222-2222-4222-b222-000000000014", name: "Cetirizine 10mg", category: "Antihistamine", criticality: 1, unit: "tablet", leadTime: 5 },
  { id: "22222222-2222-4222-b222-000000000015", name: "Ringer Lactate 500ml", category: "IV Fluids & Critical Care", criticality: 3, unit: "bottle", leadTime: 7 },
];

const testNames = [
  "Malaria RDT (Pf/Pv)",
  "Hemoglobin (Sahli/Digital)",
  "Blood Glucose (Strip)",
  "Urine Albumin & Sugar",
  "Rapid Plasma Reagin (Syphilis)",
];

async function seed() {
  console.log("Starting deterministic database seed...");

  try {
    // 1. Clean existing records in correct foreign key order
    console.log("Cleaning existing tables...");
    await sql`
      TRUNCATE TABLE 
        stock_transactions,
        transfer_proposals,
        agent_logs,
        notifications,
        alerts,
        test_availability,
        facility_daily,
        consumption_daily,
        stock,
        medicines,
        facilities
      CASCADE;
    `;

    // 2. Insert facilities
    console.log("Inserting facilities...");
    for (const f of facilitiesData) {
      await sql`
        INSERT INTO facilities (id, name, type, block, district, lat, lng, catchment_population, sanctioned_doctors, sanctioned_beds)
        VALUES (${f.id}, ${f.name}, ${f.type}, ${f.block}, ${f.district}, ${f.lat}, ${f.lng}, ${f.catchment}, ${f.doctors}, ${f.beds});
      `;
    }

    // 3. Insert medicines
    console.log("Inserting medicines catalogue...");
    for (const m of medicinesData) {
      await sql`
        INSERT INTO medicines (id, name, category, criticality, unit, lead_time_days, is_active)
        VALUES (${m.id}, ${m.name}, ${m.category}, ${m.criticality}, ${m.unit}, ${m.leadTime}, true);
      `;
    }

    // 4. Insert test availability
    console.log("Inserting diagnostic tests...");
    for (const f of facilitiesData) {
      for (const t of testNames) {
        // CHCs have all tests; some PHCs lack 1 test
        const isAvailable = f.type === "CHC" || rng() > 0.15;
        await sql`
          INSERT INTO test_availability (facility_id, test_name, is_available)
          VALUES (${f.id}, ${t}, ${isAvailable});
        `;
      }
    }

    // 5. Generate 90 days of historical data (ending 2026-10-17)
    console.log("Generating 90 days of consumption and facility operational history...");
    const baseDate = new Date("2026-10-17T00:00:00Z");

    const consumptionRows = [];
    const facilityDailyRows = [];

    for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - dayOffset);
      const dateStr = d.toISOString().split("T")[0];
      const isWeekend = d.getUTCDay() === 0;

      // Facility Daily Metrics
      for (const f of facilitiesData) {
        const footfallBase = f.type === "CHC" ? 180 : 45;
        const footfall = isWeekend ? Math.round(footfallBase * 0.4) : Math.round(footfallBase * (0.8 + rng() * 0.4));
        const maxBeds = f.beds;
        const bedsOccupied = Math.min(maxBeds, Math.round(maxBeds * (0.4 + rng() * 0.5)));
        const doctorsPresent = f.doctors === 1 ? (rng() > 0.08 ? 1 : 0) : Math.max(1, Math.round(f.doctors * (0.7 + rng() * 0.3)));

        facilityDailyRows.push({
          facility_id: f.id,
          date: dateStr,
          footfall,
          beds_occupied: bedsOccupied,
          doctors_present: doctorsPresent,
          last_reported_at: new Date(d.getTime() + 18 * 3600 * 1000).toISOString(),
        });
      }

      // Medicine Consumption Daily
      for (const f of facilitiesData) {
        for (const m of medicinesData) {
          const isChc = f.type === "CHC";
          let baseConsumption = 0;

          if (m.name.includes("ORS")) {
            baseConsumption = isChc ? 15 : 6;
          } else if (m.name.includes("Anti-Snake")) {
            baseConsumption = rng() > 0.85 ? (isChc ? 2 : 1) : 0;
          } else if (m.name.includes("Paracetamol")) {
            baseConsumption = isChc ? 80 : 25;
          } else if (m.name.includes("Amoxicillin")) {
            baseConsumption = isChc ? 40 : 12;
          } else {
            baseConsumption = isChc ? 20 : 8;
          }

          // Weekend dip
          let qty = isWeekend ? Math.round(baseConsumption * 0.4) : Math.round(baseConsumption * (0.7 + rng() * 0.6));
          consumptionRows.push({
            facility_id: f.id,
            medicine_id: m.id,
            date: dateStr,
            quantity: qty,
          });
        }
      }
    }

    // Batch insert consumption in chunks of 500
    console.log(`Inserting ${consumptionRows.length} consumption records...`);
    for (let i = 0; i < consumptionRows.length; i += 500) {
      const chunk = consumptionRows.slice(i, i + 500);
      await sql`
        INSERT INTO consumption_daily ${sql(chunk, "facility_id", "medicine_id", "date", "quantity")}
      `;
    }

    // Batch insert facility daily in chunks of 500
    console.log(`Inserting ${facilityDailyRows.length} facility daily records...`);
    for (let i = 0; i < facilityDailyRows.length; i += 500) {
      const chunk = facilityDailyRows.slice(i, i + 500);
      await sql`
        INSERT INTO facility_daily ${sql(chunk, "facility_id", "date", "footfall", "beds_occupied", "doctors_present", "last_reported_at")}
      `;
    }

    // 6. Current Stock Inventory with Scripted Baseline Conditions
    console.log("Inserting current stock inventory...");
    const stockRows = [];

    const orsMed = medicinesData.find((m) => m.name.includes("ORS"));
    const asvMed = medicinesData.find((m) => m.name.includes("Anti-Snake"));
    const amoxMed = medicinesData.find((m) => m.name.includes("Amoxicillin"));

    for (const f of facilitiesData) {
      for (const m of medicinesData) {
        const isChc = f.type === "CHC";
        let qty = isChc ? randInt(300, 600) : randInt(100, 250);
        let expiryDate = "2027-06-30";

        // Scripted Condition 1: CHC Devgarh has huge surplus ORS (~650 sachets, > 40 days)
        if (f.name === "CHC Devgarh" && m.id === orsMed.id) {
          qty = 650;
        }

        // Scripted Condition 2: PHC Rampur has low ORS inventory (~120 sachets, will drop to 2.4 days under surge)
        if (f.name === "PHC Rampur" && m.id === orsMed.id) {
          qty = 120;
        }

        // Scripted Condition 3: PHC Bilkisganj has near-expiry Amoxicillin batch
        if (f.name === "PHC Bilkisganj" && m.id === amoxMed.id) {
          expiryDate = "2026-11-20"; // Expires in ~33 days!
          qty = 180;
        }

        // Scripted Condition 4: Anti-Snake Venom is strictly rationed (CHC has 20 vials, PHCs have 4-8 vials)
        if (m.id === asvMed.id) {
          qty = isChc ? 24 : 6;
        }

        stockRows.push({
          facility_id: f.id,
          medicine_id: m.id,
          batch_number: `B-${m.name.slice(0, 3).toUpperCase()}-2026-${f.name.slice(4, 6).toUpperCase()}`,
          quantity: qty,
          expiry_date: expiryDate,
        });
      }
    }

    for (let i = 0; i < stockRows.length; i += 200) {
      const chunk = stockRows.slice(i, i + 200);
      await sql`
        INSERT INTO stock ${sql(chunk, "facility_id", "medicine_id", "batch_number", "quantity", "expiry_date")}
      `;
    }

    // 7. Initial Baseline Alerts (Near Expiry Amoxicillin & Low Anti-Venom reserve)
    console.log("Inserting baseline alerts...");
    const bilkisganj = facilitiesData.find((f) => f.name === "PHC Bilkisganj");
    const rampur = facilitiesData.find((f) => f.name === "PHC Rampur");

    await sql`
      INSERT INTO alerts (facility_id, medicine_id, type, severity, status, message, message_hi, dedupe_key, details)
      VALUES 
      (
        ${bilkisganj.id}, 
        ${amoxMed.id}, 
        'EXPIRY', 
        'warning', 
        'open', 
        'Amoxicillin 500mg Batch B-AMO-2026-BI expires in 33 days. 180 capsules at risk of expiry.',
        'एमोक्सिसिलिन 500 मि.ग्रा. बैच 33 दिनों में समाप्त हो रहा है।',
        ${bilkisganj.id + ':' + amoxMed.id + ':EXPIRY'},
        '{"daysToExpiry": 33, "quantity": 180, "batch": "B-AMO-2026-BI"}'::jsonb
      ),
      (
        ${rampur.id},
        ${orsMed.id},
        'STOCKOUT_RISK',
        'warning',
        'open',
        'ORS inventory at PHC Rampur is running low (120 sachets remaining). Surge alert threshold active.',
        'पीएचसी रामपुर में ओआरएस का स्टॉक कम हो रहा है।',
        ${rampur.id + ':' + orsMed.id + ':STOCKOUT_RISK'},
        '{"currentStock": 120, "dailyBurnRate": 18.5, "daysOfStock": 6.5}'::jsonb
      );
    `;

    // 8. Initial notifications
    console.log("Inserting baseline notifications...");
    await sql`
      INSERT INTO notifications (role, channel, message, read)
      VALUES
      ('district_admin', 'in_app', 'System initialized with Sehore district baseline synthetic telemetry.', false),
      ('pharmacist', 'in_app', 'Batch B-AMO-2026-BI at PHC Bilkisganj flagged for potential redistribution due to near expiry.', false);
    `;

    console.log("SUCCESS: Deterministic seed completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("SEEDING FAILED:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();

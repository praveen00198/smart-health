/**
 * Smart Health — Dashboard Data Service
 * 
 * Fetches seeded public healthcare records from Supabase PostgreSQL via Drizzle ORM
 * and runs them through the deterministic calculation engine.
 */

import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  alerts,
  consumptionDaily,
  facilities,
  facilityDaily,
  medicines,
  stock,
  testAvailability,
  transferProposals,
} from "@/lib/db/schema";
import {
  calculateDaysOfStock,
  calculateFacilityHealthScore,
  calculateWeightedBurnRate,
  findDonors,
  FacilityHealthScoreResult,
  RedistributionResult,
  StockCalculationResult,
} from "@/lib/engine";

export interface FacilityDashboardSummary {
  id: string;
  name: string;
  type: string;
  block: string;
  district: string;
  lat: number;
  lng: number;
  catchmentPopulation: number;
  sanctionedDoctors: number;
  sanctionedBeds: number;
  healthScore: FacilityHealthScoreResult;
  stockSummary: {
    totalItems: number;
    criticalCount: number;
    warningCount: number;
    normalCount: number;
    overstockedCount: number;
    outOfStockCount: number;
  };
  telemetry: {
    footfall: number;
    bedsOccupied: number;
    doctorsPresent: number;
    lastReportedAt: string;
  } | null;
}

export interface MedicineStockSummary {
  facilityId: string;
  facilityName: string;
  medicineId: string;
  medicineName: string;
  category: string;
  criticality: number;
  leadTimeDays: number;
  unit: string;
  stockCalculation: StockCalculationResult;
  batchesCount: number;
}

export interface DashboardData {
  timestamp: string;
  districtName: string;
  metrics: {
    totalFacilities: number;
    underperformingFacilitiesCount: number;
    totalStockLines: number;
    criticalStockLinesCount: number;
    activeAlertsCount: number;
    criticalAlertsCount: number;
    pendingTransfersCount: number;
  };
  facilitiesList: FacilityDashboardSummary[];
  inventoryList: MedicineStockSummary[];
  activeAlerts: Array<{
    id: string;
    facilityId: string;
    facilityName: string;
    medicineId: string | null;
    medicineName: string | null;
    type: string;
    severity: string;
    status: string;
    message: string;
    messageHi: string | null;
    dedupeKey: string;
    createdAt: string;
  }>;
  pendingTransfers: Array<{
    id: string;
    fromFacilityName: string;
    toFacilityName: string;
    medicineName: string;
    quantity: number;
    status: string;
    distanceKm: string;
    rationale: string;
  }>;
  redistributionPreviews: RedistributionResult[];
  targetInvestigation?: {
    facilityId: string;
    facilityName: string;
    medicineId: string;
    medicineName: string;
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const db = getDb();

  // 1. Fetch raw database records in parallel
  const [
    allFacilities,
    allMedicines,
    allStock,
    recentConsumption,
    recentTelemetry,
    allTests,
    allAlerts,
    allTransfers,
  ] = await Promise.all([
    db.select().from(facilities).orderBy(facilities.name),
    db.select().from(medicines).orderBy(medicines.name),
    db.select().from(stock),
    db
      .select()
      .from(consumptionDaily)
      .where(sql`${consumptionDaily.date} >= CURRENT_DATE - INTERVAL '30 days'`),
    db
      .select()
      .from(facilityDaily)
      .orderBy(desc(facilityDaily.date))
      .limit(50),
    db.select().from(testAvailability),
    db.select().from(alerts).orderBy(desc(alerts.createdAt)),
    db.select().from(transferProposals).orderBy(desc(transferProposals.createdAt)),
  ]);

  // Lookup Maps
  const facilityMap = new Map(allFacilities.map((f) => [f.id, f]));
  const medicineMap = new Map(allMedicines.map((m) => [m.id, m]));

  // Latest telemetry per facility
  const latestTelemetryMap = new Map<string, (typeof recentTelemetry)[0]>();
  for (const t of recentTelemetry) {
    if (!latestTelemetryMap.has(t.facilityId)) {
      latestTelemetryMap.set(t.facilityId, t);
    }
  }

  // Tests per facility
  const testsByFacility = new Map<string, Array<{ testName: string; isAvailable: boolean }>>();
  for (const t of allTests) {
    const list = testsByFacility.get(t.facilityId) ?? [];
    list.push({ testName: t.testName, isAvailable: t.isAvailable });
    testsByFacility.set(t.facilityId, list);
  }

  // Stock batches grouped by `facilityId:medicineId`
  const stockByPair = new Map<string, Array<{ batchNumber: string; quantity: number; expiryDate: string }>>();
  for (const s of allStock) {
    const key = `${s.facilityId}:${s.medicineId}`;
    const list = stockByPair.get(key) ?? [];
    list.push({
      batchNumber: s.batchNumber,
      quantity: s.quantity,
      expiryDate: s.expiryDate,
    });
    stockByPair.set(key, list);
  }

  // Consumption records grouped by `facilityId:medicineId`
  const consumptionByPair = new Map<string, Array<{ date: string; quantity: number }>>();
  for (const c of recentConsumption) {
    const key = `${c.facilityId}:${c.medicineId}`;
    const list = consumptionByPair.get(key) ?? [];
    list.push({ date: c.date, quantity: c.quantity });
    consumptionByPair.set(key, list);
  }

  // 2. Compute stock levels and burn rates using Deterministic Engine
  const inventoryList: MedicineStockSummary[] = [];
  const facilityStockMap = new Map<string, Array<{ daysOfStock: number | null; medicine: typeof allMedicines[0] }>>();

  for (const facility of allFacilities) {
    const itemsForFacility: Array<{ daysOfStock: number | null; medicine: typeof allMedicines[0] }> = [];

    for (const medicine of allMedicines) {
      const pairKey = `${facility.id}:${medicine.id}`;
      const batches = stockByPair.get(pairKey) ?? [];
      const history = consumptionByPair.get(pairKey) ?? [];

      // Engine call: Weighted burn rate
      const burnResult = calculateWeightedBurnRate(history);

      // Engine call: Days of stock remaining & risk classification
      const stockCalc = calculateDaysOfStock({
        stockBatches: batches,
        dailyBurnRate: burnResult.rate,
        medicine: {
          id: medicine.id,
          name: medicine.name,
          criticality: medicine.criticality,
          leadTimeDays: medicine.leadTimeDays,
          unit: medicine.unit,
        },
      });

      inventoryList.push({
        facilityId: facility.id,
        facilityName: facility.name,
        medicineId: medicine.id,
        medicineName: medicine.name,
        category: medicine.category,
        criticality: medicine.criticality,
        leadTimeDays: medicine.leadTimeDays,
        unit: medicine.unit,
        stockCalculation: stockCalc,
        batchesCount: batches.length,
      });

      itemsForFacility.push({
        daysOfStock: stockCalc.daysOfStock,
        medicine,
      });
    }

    facilityStockMap.set(facility.id, itemsForFacility);
  }

  // 3. Compute Facility Health Scores
  const facilitiesList: FacilityDashboardSummary[] = [];

  for (const facility of allFacilities) {
    const telemetry = latestTelemetryMap.get(facility.id) ?? null;
    const tests = testsByFacility.get(facility.id) ?? [];
    const stockItems = facilityStockMap.get(facility.id) ?? [];

    const defaultTelemetry = telemetry ?? {
      date: new Date().toISOString().split("T")[0],
      footfall: 50,
      bedsOccupied: 1,
      doctorsPresent: facility.sanctionedDoctors,
      lastReportedAt: new Date().toISOString(),
      facilityId: facility.id,
      id: "fallback",
    };

    // Engine call: Facility Health Score
    const healthScore = calculateFacilityHealthScore({
      stockItems: stockItems.map((item) => ({
        medicine: {
          criticality: item.medicine.criticality,
          leadTimeDays: item.medicine.leadTimeDays,
        },
        daysOfStock: item.daysOfStock,
      })),
      telemetry: {
        date: defaultTelemetry.date,
        footfall: defaultTelemetry.footfall,
        bedsOccupied: defaultTelemetry.bedsOccupied,
        doctorsPresent: defaultTelemetry.doctorsPresent,
        lastReportedAt: defaultTelemetry.lastReportedAt instanceof Date
          ? defaultTelemetry.lastReportedAt.toISOString()
          : String(defaultTelemetry.lastReportedAt),
        sanctionedDoctors: facility.sanctionedDoctors,
        sanctionedBeds: facility.sanctionedBeds,
      },
      tests,
    });

    const facilityInventory = inventoryList.filter((inv) => inv.facilityId === facility.id);
    const stockSummary = {
      totalItems: facilityInventory.length,
      criticalCount: facilityInventory.filter((i) => i.stockCalculation.status === "CRITICAL").length,
      warningCount: facilityInventory.filter((i) => i.stockCalculation.status === "WARNING").length,
      normalCount: facilityInventory.filter((i) => i.stockCalculation.status === "NORMAL").length,
      overstockedCount: facilityInventory.filter((i) => i.stockCalculation.status === "OVERSTOCKED").length,
      outOfStockCount: facilityInventory.filter((i) => i.stockCalculation.status === "OUT_OF_STOCK").length,
    };

    facilitiesList.push({
      id: facility.id,
      name: facility.name,
      type: facility.type,
      block: facility.block,
      district: facility.district,
      lat: facility.lat,
      lng: facility.lng,
      catchmentPopulation: facility.catchmentPopulation,
      sanctionedDoctors: facility.sanctionedDoctors,
      sanctionedBeds: facility.sanctionedBeds,
      healthScore,
      stockSummary,
      telemetry: telemetry
        ? {
            footfall: telemetry.footfall,
            bedsOccupied: telemetry.bedsOccupied,
            doctorsPresent: telemetry.doctorsPresent,
            lastReportedAt: telemetry.lastReportedAt instanceof Date
              ? telemetry.lastReportedAt.toISOString()
              : String(telemetry.lastReportedAt),
          }
        : null,
    });
  }

  // 4. Generate Redistribution Previews for Critical Shortages
  const redistributionPreviews: RedistributionResult[] = [];

  // Identify any critical or out-of-stock items (specifically ORS / critical items)
  const criticalItems = inventoryList.filter(
    (inv) =>
      (inv.stockCalculation.status === "CRITICAL" || inv.stockCalculation.status === "OUT_OF_STOCK") &&
      inv.stockCalculation.dailyBurnRate !== null &&
      inv.stockCalculation.dailyBurnRate > 0
  );

  for (const crit of criticalItems.slice(0, 2)) {
    const recipientFac = facilityMap.get(crit.facilityId);
    if (!recipientFac) continue;

    const potentialDonors = allFacilities
      .filter((f) => f.id !== crit.facilityId)
      .map((f) => {
        const donorBatches = stockByPair.get(`${f.id}:${crit.medicineId}`) ?? [];
        const donorHistory = consumptionByPair.get(`${f.id}:${crit.medicineId}`) ?? [];
        const donorBurn = calculateWeightedBurnRate(donorHistory).rate ?? 1;

        return {
          facilityId: f.id,
          facilityName: f.name,
          lat: f.lat,
          lng: f.lng,
          batches: donorBatches,
          dailyBurnRate: donorBurn,
        };
      });

    // Engine call: findDonors
    const preview = findDonors({
      recipient: {
        facilityId: recipientFac.id,
        facilityName: recipientFac.name,
        lat: recipientFac.lat,
        lng: recipientFac.lng,
        currentStock: crit.stockCalculation.availableStock,
        dailyBurnRate: crit.stockCalculation.dailyBurnRate ?? 1,
      },
      potentialDonors,
      medicine: {
        id: crit.medicineId,
        name: crit.medicineName,
        criticality: crit.criticality,
        leadTimeDays: crit.leadTimeDays,
      },
    });

    if (preview.candidates.length > 0) {
      redistributionPreviews.push(preview);
    }
  }

  // 5. Active Alerts formatting
  const formattedAlerts = allAlerts.map((a) => {
    const fac = facilityMap.get(a.facilityId);
    const med = a.medicineId ? medicineMap.get(a.medicineId) : null;
    return {
      id: a.id,
      facilityId: a.facilityId,
      facilityName: fac ? fac.name : "District Facility",
      medicineId: a.medicineId,
      medicineName: med ? med.name : null,
      type: a.type,
      severity: a.severity,
      status: a.status,
      message: a.message,
      messageHi: a.messageHi,
      dedupeKey: a.dedupeKey,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
    };
  });

  // 6. Transfers formatting
  const formattedTransfers = allTransfers.map((t) => {
    const fromFac = facilityMap.get(t.fromFacilityId);
    const toFac = facilityMap.get(t.toFacilityId);
    const med = medicineMap.get(t.medicineId);
    return {
      id: t.id,
      fromFacilityName: fromFac ? fromFac.name : "Donor",
      toFacilityName: toFac ? toFac.name : "Recipient",
      medicineName: med ? med.name : "Medicine",
      quantity: t.quantity,
      status: t.status,
      distanceKm: String(t.distanceKm),
      rationale: t.rationale,
    };
  });

  // Aggregate District Metrics
  const criticalStockLinesCount = inventoryList.filter(
    (i) => i.stockCalculation.status === "CRITICAL" || i.stockCalculation.status === "OUT_OF_STOCK"
  ).length;

  const underperformingFacilitiesCount = facilitiesList.filter(
    (f) => f.healthScore.status === "UNDERPERFORMING"
  ).length;

  const activeAlertsCount = formattedAlerts.filter((a) => a.status === "open").length;
  const criticalAlertsCount = formattedAlerts.filter(
    (a) => a.status === "open" && a.severity === "critical"
  ).length;

  const rampurFac = allFacilities.find((f) => f.name.includes("Rampur")) ?? allFacilities[0];
  const orsMed = allMedicines.find((m) => m.name.includes("ORS")) ?? allMedicines[0];
  const targetInvestigation =
    rampurFac && orsMed
      ? {
          facilityId: rampurFac.id,
          facilityName: rampurFac.name,
          medicineId: orsMed.id,
          medicineName: orsMed.name,
        }
      : undefined;

  return {
    timestamp: new Date().toISOString(),
    districtName: "Sehore District, Madhya Pradesh",
    metrics: {
      totalFacilities: allFacilities.length,
      underperformingFacilitiesCount,
      totalStockLines: inventoryList.length,
      criticalStockLinesCount,
      activeAlertsCount,
      criticalAlertsCount,
      pendingTransfersCount: formattedTransfers.filter((t) => t.status === "proposed").length,
    },
    facilitiesList,
    inventoryList,
    activeAlerts: formattedAlerts,
    pendingTransfers: formattedTransfers,
    redistributionPreviews,
    targetInvestigation,
  };
}

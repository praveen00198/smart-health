/**
 * Smart Health — Deterministic Facility Health Score
 * 
 * Rules (Handoff 9.7 & Approved Formulas):
 * - Composite score from 0 to 100 with 5 visible weighted components:
 *   1. Stock Availability (35%): Percentage of High-Criticality (>= 2) medicines above warning threshold.
 *   2. Doctor Attendance (25%): doctorsPresent / sanctionedDoctors ratio (clamped to 0-100%).
 *   3. Bed Readiness (15%): Available capacity max(0, 1 - (bedsOccupied / sanctionedBeds)) * 100.
 *   4. Diagnostic Test Availability (15%): availableTests / totalMandatedTests ratio (0-100%).
 *   5. Data Freshness (10%): Hours since lastReportedAt (<24h: 100%, <48h: 75%, <72h: 50%, >=72h: 0%).
 * 
 * Underperforming Flag:
 * - Status is UNDERPERFORMING if total score < 60 OR any component < 40.
 * - Reasons list explicitly details every failing component.
 */

import {
  DiagnosticTestInput,
  FacilityHealthScoreResult,
  FacilityTelemetryInput,
  MedicineScope,
} from "./types";

export interface MedicineStockStatusInput {
  medicine: MedicineScope;
  daysOfStock: number | null;
}

const MS_PER_HOUR = 3_600_000;

export function calculateFacilityHealthScore(params: {
  stockItems: MedicineStockStatusInput[];
  telemetry: FacilityTelemetryInput;
  tests: DiagnosticTestInput[];
  calculationTime?: string; // ISO datetime string
}): FacilityHealthScoreResult {
  const { stockItems, telemetry, tests } = params;

  const reasons: string[] = [];

  // 1. Stock Availability Component (35%)
  // Filter for high-criticality medicines (criticality >= 2)
  const highCriticalityItems = stockItems.filter(
    (item) => item.medicine.criticality >= 2
  );

  const itemsToEvaluate =
    highCriticalityItems.length > 0 ? highCriticalityItems : stockItems;

  let stockScore = 100;
  let stockDetails = "All evaluated medicines maintain safe stock levels.";

  if (itemsToEvaluate.length > 0) {
    let compliantCount = 0;
    for (const item of itemsToEvaluate) {
      const leadTime =
        item.medicine.leadTimeDays > 0 ? item.medicine.leadTimeDays : 7;
      const warningThreshold =
        item.medicine.criticality >= 3 ? 3 * leadTime : 2 * leadTime;

      if (item.daysOfStock !== null && item.daysOfStock >= warningThreshold) {
        compliantCount += 1;
      }
    }

    stockScore = Math.round((compliantCount / itemsToEvaluate.length) * 100);
    stockDetails = `${compliantCount}/${itemsToEvaluate.length} critical medicines above warning threshold.`;
  }

  if (stockScore < 40) {
    reasons.push(
      `Critical stock availability is severely depressed (${stockScore}% compliant).`
    );
  } else if (stockScore < 70) {
    reasons.push(
      `Stock availability is below optimal reserve levels (${stockScore}% compliant).`
    );
  }

  // 2. Doctor Attendance Component (25%)
  const sanctionedDoctors = Math.max(1, telemetry.sanctionedDoctors);
  const presentDoctors = Math.max(0, telemetry.doctorsPresent);
  const attendanceRatio = Math.min(1.0, presentDoctors / sanctionedDoctors);
  const doctorScore = Math.round(attendanceRatio * 100);
  const doctorDetails = `${presentDoctors}/${sanctionedDoctors} sanctioned doctors present.`;

  if (doctorScore < 40) {
    reasons.push(
      `Severe doctor staffing shortage (${presentDoctors}/${sanctionedDoctors} present).`
    );
  } else if (doctorScore < 100) {
    reasons.push(`Incomplete doctor staffing (${doctorScore}% attendance).`);
  }

  // 3. Bed Readiness Component (15%)
  // Available capacity ratio: max(0, 1 - (bedsOccupied / sanctionedBeds)) * 100
  const sanctionedBeds = Math.max(1, telemetry.sanctionedBeds);
  const occupiedBeds = Math.max(0, telemetry.bedsOccupied);

  let bedScore = 0;
  let bedDetails = "";

  if (occupiedBeds >= sanctionedBeds) {
    bedScore = 0;
    bedDetails = `Facility beds are at full capacity or overcrowded (${occupiedBeds}/${sanctionedBeds} occupied).`;
    reasons.push(
      `Bed capacity fully saturated or overcrowded (${occupiedBeds}/${sanctionedBeds} occupied).`
    );
  } else {
    const availableRatio = (sanctionedBeds - occupiedBeds) / sanctionedBeds;
    bedScore = Math.round(availableRatio * 100);
    bedDetails = `${sanctionedBeds - occupiedBeds}/${sanctionedBeds} beds available for admissions.`;
    if (bedScore < 40) {
      reasons.push(`Low available bed capacity (${bedScore}% beds ready).`);
    }
  }

  // 4. Diagnostic Test Availability Component (15%)
  let testScore = 100;
  let testDetails = "No diagnostic tests mandated.";

  if (tests && tests.length > 0) {
    const availableTestsCount = tests.filter((t) => t.isAvailable).length;
    testScore = Math.round((availableTestsCount / tests.length) * 100);
    testDetails = `${availableTestsCount}/${tests.length} essential diagnostic tests functional.`;

    if (testScore < 40) {
      reasons.push(
        `Critical diagnostic testing deficit (${availableTestsCount}/${tests.length} tests available).`
      );
    } else if (testScore < 80) {
      reasons.push(
        `Some essential diagnostic tests are unavailable (${testScore}% available).`
      );
    }
  }

  // 5. Data Freshness Component (10%)
  const calcEpoch = params.calculationTime
    ? new Date(params.calculationTime).getTime()
    : Date.now();
  const lastReportedEpoch = new Date(telemetry.lastReportedAt).getTime();
  const hoursSinceReport = Math.max(
    0,
    (calcEpoch - lastReportedEpoch) / MS_PER_HOUR
  );

  let freshnessScore = 0;
  let freshnessDetails = "";

  if (hoursSinceReport < 24) {
    freshnessScore = 100;
    freshnessDetails = `Reported ${Math.round(hoursSinceReport)}h ago (< 24h).`;
  } else if (hoursSinceReport < 48) {
    freshnessScore = 75;
    freshnessDetails = `Reported ${Math.round(hoursSinceReport)}h ago (< 48h).`;
    reasons.push(
      `Operational telemetry is aging (${Math.round(hoursSinceReport)} hours old).`
    );
  } else if (hoursSinceReport < 72) {
    freshnessScore = 50;
    freshnessDetails = `Reported ${Math.round(hoursSinceReport)}h ago (< 72h).`;
    reasons.push(
      `Operational telemetry is stale (${Math.round(hoursSinceReport)} hours old).`
    );
  } else {
    freshnessScore = 0;
    freshnessDetails = `Reported ${Math.round(hoursSinceReport)}h ago (>= 72h).`;
    reasons.push(
      `Operational telemetry is critically outdated (${Math.round(hoursSinceReport)} hours old).`
    );
  }

  // Weighted composite sum
  const weightedStock = stockScore * 0.35;
  const weightedDoctor = doctorScore * 0.25;
  const weightedBed = bedScore * 0.15;
  const weightedDiag = testScore * 0.15;
  const weightedFresh = freshnessScore * 0.1;

  const rawScore =
    weightedStock + weightedDoctor + weightedBed + weightedDiag + weightedFresh;
  const finalScore = Math.round(rawScore * 10) / 10;

  // Determine underperforming status: total score < 60 OR any component < 40
  const isUnderperforming =
    finalScore < 60 ||
    stockScore < 40 ||
    doctorScore < 40 ||
    bedScore < 40 ||
    testScore < 40 ||
    freshnessScore < 40;

  if (isUnderperforming && reasons.length === 0) {
    reasons.push(`Total composite health score (${finalScore}) is below standard threshold of 60.`);
  }

  return {
    score: finalScore,
    status: isUnderperforming ? "UNDERPERFORMING" : "HEALTHY",
    components: {
      stockAvailability: {
        score: stockScore,
        weight: 0.35,
        weightedScore: Math.round(weightedStock * 10) / 10,
        details: stockDetails,
      },
      doctorAttendance: {
        score: doctorScore,
        weight: 0.25,
        weightedScore: Math.round(weightedDoctor * 10) / 10,
        details: doctorDetails,
      },
      bedReadiness: {
        score: bedScore,
        weight: 0.15,
        weightedScore: Math.round(weightedBed * 10) / 10,
        details: bedDetails,
      },
      testAvailability: {
        score: testScore,
        weight: 0.15,
        weightedScore: Math.round(weightedDiag * 10) / 10,
        details: testDetails,
      },
      dataFreshness: {
        score: freshnessScore,
        weight: 0.1,
        weightedScore: Math.round(weightedFresh * 10) / 10,
        details: freshnessDetails,
      },
    },
    reasons,
  };
}

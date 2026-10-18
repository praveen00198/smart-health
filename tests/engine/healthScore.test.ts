import { describe, expect, it } from "vitest";
import { calculateFacilityHealthScore } from "@/lib/engine/healthScore";
import { DiagnosticTestInput, FacilityTelemetryInput } from "@/lib/engine/types";

describe("Deterministic Engine — Facility Health Score", () => {
  const healthyTelemetry: FacilityTelemetryInput = {
    date: "2026-10-18",
    footfall: 120,
    bedsOccupied: 2,
    doctorsPresent: 2,
    lastReportedAt: "2026-10-18T10:00:00Z",
    sanctionedDoctors: 2,
    sanctionedBeds: 4,
  };

  const allTests: DiagnosticTestInput[] = [
    { testName: "Rapid Malaria", isAvailable: true },
    { testName: "Hemoglobin", isAvailable: true },
    { testName: "Blood Glucose", isAvailable: true },
    { testName: "Pregnancy Urine", isAvailable: true },
  ];

  it("calculates accurate composite score for a healthy facility", () => {
    // 2 medicines with criticality 2 and 3, both above warning threshold
    const stockItems = [
      { medicine: { criticality: 2, leadTimeDays: 7 }, daysOfStock: 25 }, // threshold = 14
      { medicine: { criticality: 3, leadTimeDays: 7 }, daysOfStock: 30 }, // threshold = 21
    ];

    const result = calculateFacilityHealthScore({
      stockItems,
      telemetry: healthyTelemetry,
      tests: allTests,
      calculationTime: "2026-10-18T12:00:00Z", // 2 hours after lastReportedAt (<24h -> 100%)
    });

    // Stock: 100% -> 35
    // Doctor: 2/2 = 100% -> 25
    // Beds: (4 - 2) / 4 = 50% -> 7.5
    // Tests: 4/4 = 100% -> 15
    // Freshness: < 24h = 100% -> 10
    // Total = 35 + 25 + 7.5 + 15 + 10 = 92.5
    expect(result.score).toBe(92.5);
    expect(result.status).toBe("HEALTHY");
    expect(result.components.stockAvailability.score).toBe(100);
    expect(result.components.doctorAttendance.score).toBe(100);
    expect(result.components.bedReadiness.score).toBe(50);
    expect(result.components.testAvailability.score).toBe(100);
    expect(result.components.dataFreshness.score).toBe(100);
  });

  it("flags UNDERPERFORMING when doctor attendance falls below 40%", () => {
    const stockItems = [
      { medicine: { criticality: 2, leadTimeDays: 7 }, daysOfStock: 25 },
    ];

    const lowDoctorTelemetry: FacilityTelemetryInput = {
      ...healthyTelemetry,
      doctorsPresent: 0, // 0/2 = 0% (< 40% threshold!)
    };

    const result = calculateFacilityHealthScore({
      stockItems,
      telemetry: lowDoctorTelemetry,
      tests: allTests,
      calculationTime: "2026-10-18T12:00:00Z",
    });

    expect(result.status).toBe("UNDERPERFORMING");
    expect(result.components.doctorAttendance.score).toBe(0);
    expect(result.reasons.some((r) => r.includes("doctor"))).toBe(true);
  });

  it("flags UNDERPERFORMING when bed capacity is 100% saturated", () => {
    const stockItems = [
      { medicine: { criticality: 2, leadTimeDays: 7 }, daysOfStock: 25 },
    ];

    const fullBedsTelemetry: FacilityTelemetryInput = {
      ...healthyTelemetry,
      bedsOccupied: 4, // 4/4 occupied -> 0% available capacity
      sanctionedBeds: 4,
    };

    const result = calculateFacilityHealthScore({
      stockItems,
      telemetry: fullBedsTelemetry,
      tests: allTests,
      calculationTime: "2026-10-18T12:00:00Z",
    });

    expect(result.status).toBe("UNDERPERFORMING");
    expect(result.components.bedReadiness.score).toBe(0);
    expect(result.reasons.some((r) => r.includes("capacity"))).toBe(true);
  });

  it("accurately steps data freshness across the 24h, 48h, 72h thresholds", () => {
    const stockItems = [
      { medicine: { criticality: 2, leadTimeDays: 7 }, daysOfStock: 25 },
    ];

    const baseTelemetry: FacilityTelemetryInput = {
      ...healthyTelemetry,
      lastReportedAt: "2026-10-15T00:00:00Z",
    };

    // 12 hours later (< 24h) -> 100%
    const res12h = calculateFacilityHealthScore({
      stockItems,
      telemetry: baseTelemetry,
      tests: allTests,
      calculationTime: "2026-10-15T12:00:00Z",
    });
    expect(res12h.components.dataFreshness.score).toBe(100);

    // 36 hours later (< 48h) -> 75%
    const res36h = calculateFacilityHealthScore({
      stockItems,
      telemetry: baseTelemetry,
      tests: allTests,
      calculationTime: "2026-10-16T12:00:00Z",
    });
    expect(res36h.components.dataFreshness.score).toBe(75);

    // 60 hours later (< 72h) -> 50%
    const res60h = calculateFacilityHealthScore({
      stockItems,
      telemetry: baseTelemetry,
      tests: allTests,
      calculationTime: "2026-10-17T12:00:00Z",
    });
    expect(res60h.components.dataFreshness.score).toBe(50);

    // 80 hours later (>= 72h) -> 0%
    const res80h = calculateFacilityHealthScore({
      stockItems,
      telemetry: baseTelemetry,
      tests: allTests,
      calculationTime: "2026-10-18T08:00:00Z",
    });
    expect(res80h.components.dataFreshness.score).toBe(0);
    expect(res80h.status).toBe("UNDERPERFORMING");
  });

  it("penalizes stock availability when high-criticality medicines are in warning/critical state", () => {
    // 2 high-criticality medicines:
    // Medicine 1: threshold 14, daysOfStock = 5 (FAIL)
    // Medicine 2: threshold 21, daysOfStock = 10 (FAIL)
    const failingStockItems = [
      { medicine: { criticality: 2, leadTimeDays: 7 }, daysOfStock: 5 },
      { medicine: { criticality: 3, leadTimeDays: 7 }, daysOfStock: 10 },
    ];

    const result = calculateFacilityHealthScore({
      stockItems: failingStockItems,
      telemetry: healthyTelemetry,
      tests: allTests,
      calculationTime: "2026-10-18T12:00:00Z",
    });

    expect(result.components.stockAvailability.score).toBe(0);
    expect(result.status).toBe("UNDERPERFORMING");
    expect(result.reasons.some((r) => r.includes("stock availability"))).toBe(true);
  });

  it("is strictly deterministic across repeated runs", () => {
    const stockItems = [
      { medicine: { criticality: 2, leadTimeDays: 7 }, daysOfStock: 18 },
    ];

    const run1 = calculateFacilityHealthScore({
      stockItems,
      telemetry: healthyTelemetry,
      tests: allTests,
      calculationTime: "2026-10-18T12:00:00Z",
    });

    const run2 = calculateFacilityHealthScore({
      stockItems,
      telemetry: healthyTelemetry,
      tests: allTests,
      calculationTime: "2026-10-18T12:00:00Z",
    });

    expect(run1).toEqual(run2);
  });
});

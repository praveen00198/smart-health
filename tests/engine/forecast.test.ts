import { describe, expect, it } from "vitest";
import { forecast14d } from "@/lib/engine/forecast";
import { ConsumptionRecordInput } from "@/lib/engine/types";

describe("Deterministic Engine — 14-Day Demand Forecast", () => {
  it("generates a 14-day projection sequence with exact dates and weekday mapping", () => {
    // Synthetic 14-day history
    const history: ConsumptionRecordInput[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      quantity: 20,
    }));

    const result = forecast14d({
      history,
      baselineDailyRate: 20,
      startDate: "2026-10-15",
    });

    expect(result.horizonDays).toBe(14);
    expect(result.dailyForecasts).toHaveLength(14);
    expect(result.dailyForecasts[0].date).toBe("2026-10-15");
    expect(result.dailyForecasts[13].date).toBe("2026-10-28");
    expect(result.totalForecast14d).toBeGreaterThan(0);
    expect(result.basis).toContain("14-day forecast");
  });

  it("handles zero or null baseline consumption gracefully with zero projections", () => {
    const resultNull = forecast14d({
      history: [],
      baselineDailyRate: null,
      startDate: "2026-10-15",
    });

    expect(resultNull.baselineDailyRate).toBe(0);
    expect(resultNull.totalForecast14d).toBe(0);
    expect(resultNull.dailyForecasts).toHaveLength(14);
    expect(resultNull.dailyForecasts[0].forecast).toBe(0);
    expect(resultNull.dailyForecasts[0].lowerBound).toBe(0);
    expect(resultNull.dailyForecasts[0].upperBound).toBe(0);

    const resultZero = forecast14d({
      history: [],
      baselineDailyRate: 0,
      startDate: "2026-10-15",
    });

    expect(resultZero.totalForecast14d).toBe(0);
  });

  it("applies surge multiplier correctly for epidemic / seasonal peaks", () => {
    const history: ConsumptionRecordInput[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      quantity: 20,
    }));

    const baseline = forecast14d({
      history,
      baselineDailyRate: 20,
      startDate: "2026-10-15",
      surgeMultiplier: 1.0,
    });

    const surge = forecast14d({
      history,
      baselineDailyRate: 20,
      startDate: "2026-10-15",
      surgeMultiplier: 1.4, // e.g. 1.4x monsoon surge for ORS
    });

    expect(surge.totalForecast14d).toBeGreaterThan(baseline.totalForecast14d);
    expect(surge.basis).toContain("1.4x");
  });

  it("calculates confidence intervals (+/- 1.28 * sigma) and clamps lower bound to non-negative", () => {
    // History with variance: alternating between 5 and 35 (mean 20)
    const history: ConsumptionRecordInput[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      quantity: i % 2 === 0 ? 5 : 35,
    }));

    const result = forecast14d({
      history,
      baselineDailyRate: 20,
      startDate: "2026-10-15",
    });

    expect(result.residualStdDev).toBeGreaterThan(0);
    for (const day of result.dailyForecasts) {
      expect(day.lowerBound).toBeGreaterThanOrEqual(0);
      expect(day.upperBound).toBeGreaterThanOrEqual(day.forecast);
      expect(day.forecast).toBeGreaterThanOrEqual(day.lowerBound);
    }
  });

  it("is strictly deterministic across repeated runs with identical parameters", () => {
    const history: ConsumptionRecordInput[] = [
      { date: "2026-10-10", quantity: 15 },
      { date: "2026-10-11", quantity: 18 },
      { date: "2026-10-12", quantity: 22 },
      { date: "2026-10-13", quantity: 19 },
    ];

    const run1 = forecast14d({ history, baselineDailyRate: 18.5, startDate: "2026-10-14" });
    const run2 = forecast14d({ history, baselineDailyRate: 18.5, startDate: "2026-10-14" });

    expect(run1).toEqual(run2);
  });
});

import { describe, expect, it } from "vitest";
import {
  calculateDaysOfStock,
  calculateWeightedBurnRate,
  classifyStockRisk,
} from "@/lib/engine/stock";
import { MedicineScope, StockBatchInput } from "@/lib/engine/types";

describe("Deterministic Stock Engine — Burn Rate", () => {
  it("calculates weighted average daily consumption using linear decay over 14 days", () => {
    // 14 days of consumption ending on 2026-10-18
    // If every day had 10 units, weighted burn rate must be exactly 10.0
    const history = Array.from({ length: 14 }, (_, i) => {
      const dayNum = String(5 + i).padStart(2, "0");
      return {
        date: `2026-10-${dayNum}`,
        quantity: 10,
      };
    });

    const result = calculateWeightedBurnRate(history, "2026-10-18");
    expect(result.status).toBe("VALID");
    expect(result.rate).toBe(10.0);
    expect(result.validDaysCount).toBe(14);
    expect(result.totalQuantity).toBe(140);
    // Weights sum for 1..14 = (14 * 15) / 2 = 105
    expect(result.weightsSum).toBe(105);
  });

  it("weights recent days more heavily than older days", () => {
    // History where older days have 0 and most recent day has 14 units
    // Day 2026-10-05 (offset 13, weight 1) = 0
    // Day 2026-10-18 (offset 0, weight 14) = 14
    const history = [
      { date: "2026-10-05", quantity: 0 },
      { date: "2026-10-10", quantity: 0 },
      { date: "2026-10-18", quantity: 14 },
    ];

    const result = calculateWeightedBurnRate(history, "2026-10-18");
    expect(result.status).toBe("VALID");
    // Day 10-05: offset 13, weight 1, qty 0
    // Day 10-10: offset 8, weight 6, qty 0
    // Day 10-18: offset 0, weight 14, qty 14
    // sum = 14 * 14 = 196. weights = 1 + 6 + 14 = 21. rate = 196 / 21 = 9.33
    expect(result.rate).toBe(9.33);
  });

  it("returns INSUFFICIENT_DATA when fewer than 3 distinct days are provided", () => {
    const history = [
      { date: "2026-10-17", quantity: 20 },
      { date: "2026-10-18", quantity: 25 },
    ];

    const result = calculateWeightedBurnRate(history, "2026-10-18");
    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.rate).toBeNull();
  });

  it("returns NO_CONSUMPTION when all recorded quantities in window are zero", () => {
    const history = [
      { date: "2026-10-15", quantity: 0 },
      { date: "2026-10-16", quantity: 0 },
      { date: "2026-10-17", quantity: 0 },
      { date: "2026-10-18", quantity: 0 },
    ];

    const result = calculateWeightedBurnRate(history, "2026-10-18");
    expect(result.status).toBe("NO_CONSUMPTION");
    expect(result.rate).toBe(0);
    expect(result.totalQuantity).toBe(0);
  });

  it("aggregates multiple consumption records on the same calendar date and clamps negative values", () => {
    const history = [
      { date: "2026-10-16", quantity: 10 },
      { date: "2026-10-16", quantity: 15 }, // same day -> total 25
      { date: "2026-10-17", quantity: -5 }, // negative -> clamped to 0
      { date: "2026-10-18", quantity: 20 },
    ];

    const result = calculateWeightedBurnRate(history, "2026-10-18");
    expect(result.status).toBe("VALID");
    expect(result.validDaysCount).toBe(3);
    expect(result.totalQuantity).toBe(45); // 25 + 0 + 20
  });
});

describe("Deterministic Stock Engine — Days of Stock & Expiry Exclusion", () => {
  const medicineCrit3: MedicineScope = {
    name: "Anti-Snake Venom",
    criticality: 3,
    leadTimeDays: 7,
  };

  const medicineCrit1: MedicineScope = {
    name: "Paracetamol",
    criticality: 1,
    leadTimeDays: 5,
  };

  it("calculates normal days of stock correctly (stock = 500, burn = 25 -> 20 days)", () => {
    const batches: StockBatchInput[] = [
      { batchNumber: "B1", quantity: 500, expiryDate: "2027-01-01" },
    ];

    const result = calculateDaysOfStock({
      stockBatches: batches,
      dailyBurnRate: 25,
      medicine: medicineCrit1,
      currentDate: "2026-10-18",
    });

    expect(result.availableStock).toBe(500);
    expect(result.expiredStock).toBe(0);
    expect(result.daysOfStock).toBe(20);
    // leadTime 5, crit 1 -> warning threshold is 2 * 5 = 10. 20 is NORMAL.
    expect(result.status).toBe("NORMAL");
  });

  it("strictly excludes expired batches from available stock", () => {
    const batches: StockBatchInput[] = [
      { batchNumber: "EXP-1", quantity: 150, expiryDate: "2026-10-10" }, // Expired 8 days ago
      { batchNumber: "ACT-1", quantity: 300, expiryDate: "2027-06-01" }, // Valid
    ];

    const result = calculateDaysOfStock({
      stockBatches: batches,
      dailyBurnRate: 15,
      medicine: medicineCrit1,
      currentDate: "2026-10-18",
    });

    expect(result.availableStock).toBe(300);
    expect(result.expiredStock).toBe(150);
    expect(result.daysOfStock).toBe(20);
  });

  it("handles zero stock explicitly returning 0 days and OUT_OF_STOCK", () => {
    const batches: StockBatchInput[] = [
      { batchNumber: "EMPTY", quantity: 0, expiryDate: "2027-01-01" },
    ];

    const result = calculateDaysOfStock({
      stockBatches: batches,
      dailyBurnRate: 10,
      medicine: medicineCrit1,
      currentDate: "2026-10-18",
    });

    expect(result.availableStock).toBe(0);
    expect(result.daysOfStock).toBe(0);
    expect(result.status).toBe("OUT_OF_STOCK");
  });

  it("handles zero or null burn rate returning null daysOfStock and NO_CONSUMPTION", () => {
    const batches: StockBatchInput[] = [
      { batchNumber: "B1", quantity: 200, expiryDate: "2027-01-01" },
    ];

    const resultZero = calculateDaysOfStock({
      stockBatches: batches,
      dailyBurnRate: 0,
      medicine: medicineCrit1,
      currentDate: "2026-10-18",
    });

    expect(resultZero.availableStock).toBe(200);
    expect(resultZero.daysOfStock).toBeNull();
    expect(resultZero.status).toBe("NO_CONSUMPTION");

    const resultNull = calculateDaysOfStock({
      stockBatches: batches,
      dailyBurnRate: null,
      medicine: medicineCrit1,
      currentDate: "2026-10-18",
    });

    expect(resultNull.daysOfStock).toBeNull();
    expect(resultNull.status).toBe("NO_CONSUMPTION");
  });

  it("classifies risk correctly across threshold boundaries", () => {
    // Criticality 3, lead time 7:
    // criticalThreshold = 7
    // warningThreshold = 3 * 7 = 21
    // normal: 21 to 45
    // overstocked: > 45

    expect(classifyStockRisk(0, medicineCrit3)).toBe("OUT_OF_STOCK");
    expect(classifyStockRisk(5.0, medicineCrit3)).toBe("CRITICAL");
    expect(classifyStockRisk(6.99, medicineCrit3)).toBe("CRITICAL");
    expect(classifyStockRisk(7.0, medicineCrit3)).toBe("WARNING");
    expect(classifyStockRisk(20.9, medicineCrit3)).toBe("WARNING");
    expect(classifyStockRisk(21.0, medicineCrit3)).toBe("NORMAL");
    expect(classifyStockRisk(45.0, medicineCrit3)).toBe("NORMAL");
    expect(classifyStockRisk(45.1, medicineCrit3)).toBe("OVERSTOCKED");
  });

  it("maintains determinism across repeated executions with identical inputs", () => {
    const batches: StockBatchInput[] = [
      { batchNumber: "B1", quantity: 350, expiryDate: "2027-02-15" },
      { batchNumber: "B2", quantity: 150, expiryDate: "2026-12-01" }, // near expiry (<90d)
    ];

    const run1 = calculateDaysOfStock({
      stockBatches: batches,
      dailyBurnRate: 14.5,
      medicine: medicineCrit3,
      currentDate: "2026-10-18",
    });

    const run2 = calculateDaysOfStock({
      stockBatches: batches,
      dailyBurnRate: 14.5,
      medicine: medicineCrit3,
      currentDate: "2026-10-18",
    });

    expect(run1).toEqual(run2);
    expect(run1.nearExpiryStock).toBe(150);
  });
});

import { describe, expect, it } from "vitest";
import { calculateExpiryRisk } from "@/lib/engine/expiry";
import { StockBatchInput } from "@/lib/engine/types";

describe("Deterministic Engine — Expiry Risk Evaluation", () => {
  it("evaluates expired, near-expiry, and safe batch statuses accurately", () => {
    // Current date: 2026-10-18
    const batches: StockBatchInput[] = [
      { batchNumber: "B-EXP", quantity: 50, expiryDate: "2026-10-10" }, // Expired
      { batchNumber: "B-NEAR", quantity: 100, expiryDate: "2026-11-18" }, // 31 days left (NEAR_EXPIRY <= 90d)
      { batchNumber: "B-SAFE", quantity: 300, expiryDate: "2027-06-01" }, // > 90 days left (SAFE)
    ];

    const result = calculateExpiryRisk({
      batches,
      dailyBurnRate: 10,
      currentDate: "2026-10-18",
    });

    expect(result.totalBatches).toBe(3);
    expect(result.expiredBatchesCount).toBe(1);
    expect(result.expiredQuantity).toBe(50);
    expect(result.nearExpiryBatchesCount).toBe(1);
    expect(result.nearExpiryQuantity).toBe(100);

    const bExp = result.batches.find((b) => b.batchNumber === "B-EXP");
    expect(bExp?.status).toBe("EXPIRED");
    expect(bExp?.estimatedUnusedAtExpiry).toBe(50);

    const bNear = result.batches.find((b) => b.batchNumber === "B-NEAR");
    expect(bNear?.status).toBe("NEAR_EXPIRY");

    const bSafe = result.batches.find((b) => b.batchNumber === "B-SAFE");
    expect(bSafe?.status).toBe("SAFE");
  });

  it("handles boundary dates precisely: expiring today, tomorrow, and exactly at 90 days", () => {
    // Current date: 2026-10-18
    const batches: StockBatchInput[] = [
      { batchNumber: "TODAY", quantity: 20, expiryDate: "2026-10-18" }, // days = 0 -> EXPIRED
      { batchNumber: "TOMORROW", quantity: 20, expiryDate: "2026-10-19" }, // days = 1 -> NEAR_EXPIRY
      { batchNumber: "EXACT-90D", quantity: 20, expiryDate: "2027-01-16" }, // 90 days -> NEAR_EXPIRY
      { batchNumber: "DAY-91", quantity: 20, expiryDate: "2027-01-17" }, // 91 days -> SAFE
    ];

    const result = calculateExpiryRisk({
      batches,
      dailyBurnRate: 5,
      currentDate: "2026-10-18",
    });

    const todayBatch = result.batches.find((b) => b.batchNumber === "TODAY");
    expect(todayBatch?.daysUntilExpiry).toBe(0);
    expect(todayBatch?.status).toBe("EXPIRED");

    const tomorrowBatch = result.batches.find((b) => b.batchNumber === "TOMORROW");
    expect(tomorrowBatch?.daysUntilExpiry).toBe(1);
    expect(tomorrowBatch?.status).toBe("NEAR_EXPIRY");

    const exact90 = result.batches.find((b) => b.batchNumber === "EXACT-90D");
    expect(exact90?.daysUntilExpiry).toBe(90);
    expect(exact90?.status).toBe("NEAR_EXPIRY");

    const day91 = result.batches.find((b) => b.batchNumber === "DAY-91");
    expect(day91?.daysUntilExpiry).toBe(91);
    expect(day91?.status).toBe("SAFE");
  });

  it("estimates unused stock at expiry based on expected daily consumption", () => {
    // Current: 2026-10-18
    // Batch: 200 units, expires in 20 days (2026-11-07)
    // Daily burn rate = 5 units/day
    // Expected consumption before expiry = 5 * 20 = 100 units
    // Estimated unused stock at expiry = 200 - 100 = 100 units
    const batches: StockBatchInput[] = [
      { batchNumber: "B-EXCESS", quantity: 200, expiryDate: "2026-11-07" },
    ];

    const result = calculateExpiryRisk({
      batches,
      dailyBurnRate: 5,
      currentDate: "2026-10-18",
    });

    expect(result.hasExpiryRiskBeforeStockout).toBe(true);
    expect(result.totalUnusedAtExpiryRisk).toBe(100);

    const b = result.batches[0];
    expect(b.expectedConsumptionBeforeExpiry).toBe(100);
    expect(b.estimatedUnusedAtExpiry).toBe(100);
  });

  it("shows zero unused stock when consumption comfortably exhausts the batch before expiry", () => {
    // Batch: 60 units, expires in 20 days
    // Daily burn rate = 5 units/day -> can consume up to 100 units in 20 days
    // Expected consumption = min(60, 100) = 60
    // Unused at expiry = 0
    const batches: StockBatchInput[] = [
      { batchNumber: "B-HEALTHY", quantity: 60, expiryDate: "2026-11-07" },
    ];

    const result = calculateExpiryRisk({
      batches,
      dailyBurnRate: 5,
      currentDate: "2026-10-18",
    });

    expect(result.hasExpiryRiskBeforeStockout).toBe(false);
    expect(result.totalUnusedAtExpiryRisk).toBe(0);
    expect(result.batches[0].estimatedUnusedAtExpiry).toBe(0);
  });
});

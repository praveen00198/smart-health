/**
 * Smart Health — Deterministic Expiry Risk Evaluation
 * 
 * Rules (Handoff 9.6):
 * - Expired: expiryDate <= currentDate.
 * - Near-expiry: expiryDate <= currentDate + 90 days.
 * - Risk flag: nearest_expiry < currentDate + daysOfStock (stock will not be fully consumed before expiring).
 * - Expected consumption before expiry: min(quantity, floor(burnRate * daysUntilExpiry)).
 * - Estimated unused stock at expiry: max(0, quantity - expectedConsumption).
 */

import { BatchExpiryEvaluation, ExpiryRiskResult, StockBatchInput } from "./types";

const MS_PER_DAY = 86_400_000;

function parseUtcDate(dateStr: string): number {
  const parts = dateStr.split("T")[0].split("-");
  return Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function formatUtcDate(epochMs: number): string {
  const d = new Date(epochMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function calculateExpiryRisk(params: {
  batches: StockBatchInput[];
  dailyBurnRate: number | null;
  currentDate?: string;
}): ExpiryRiskResult {
  const { batches, dailyBurnRate } = params;

  const currentEpoch = params.currentDate
    ? parseUtcDate(params.currentDate)
    : parseUtcDate(formatUtcDate(Date.now()));

  const nearExpiryThresholdEpoch = currentEpoch + 90 * MS_PER_DAY;

  let totalQuantity = 0;
  let expiredBatchesCount = 0;
  let expiredQuantity = 0;
  let nearExpiryBatchesCount = 0;
  let nearExpiryQuantity = 0;
  let totalUnusedAtExpiryRisk = 0;

  const evaluatedBatches: BatchExpiryEvaluation[] = [];

  // Sort batches by expiry date (FEFO)
  const sortedBatches = [...batches].sort((a, b) => {
    return parseUtcDate(a.expiryDate) - parseUtcDate(b.expiryDate);
  });

  const rate = dailyBurnRate && dailyBurnRate > 0 ? dailyBurnRate : 0;

  for (const batch of sortedBatches) {
    const qty = Math.max(0, batch.quantity);
    totalQuantity += qty;
    const expiryEpoch = parseUtcDate(batch.expiryDate);
    const daysUntilExpiry = Math.floor((expiryEpoch - currentEpoch) / MS_PER_DAY);

    if (daysUntilExpiry <= 0) {
      // Already expired
      expiredBatchesCount += 1;
      expiredQuantity += qty;
      totalUnusedAtExpiryRisk += qty;

      evaluatedBatches.push({
        batchNumber: batch.batchNumber,
        quantity: qty,
        expiryDate: batch.expiryDate,
        daysUntilExpiry,
        status: "EXPIRED",
        expectedConsumptionBeforeExpiry: 0,
        estimatedUnusedAtExpiry: qty,
      });
    } else {
      const isNearExpiry = expiryEpoch <= nearExpiryThresholdEpoch;
      if (isNearExpiry) {
        nearExpiryBatchesCount += 1;
        nearExpiryQuantity += qty;
      }

      // If burn rate is positive, estimate how much will be consumed before expiry
      const maxPossibleConsumption = Math.floor(rate * daysUntilExpiry);
      const expectedConsumption = Math.min(qty, maxPossibleConsumption);
      const estimatedUnused = Math.max(0, qty - expectedConsumption);

      totalUnusedAtExpiryRisk += estimatedUnused;

      evaluatedBatches.push({
        batchNumber: batch.batchNumber,
        quantity: qty,
        expiryDate: batch.expiryDate,
        daysUntilExpiry,
        status: isNearExpiry ? "NEAR_EXPIRY" : "SAFE",
        expectedConsumptionBeforeExpiry: expectedConsumption,
        estimatedUnusedAtExpiry: estimatedUnused,
      });
    }
  }

  // Risk heuristic: If any valid batch has estimatedUnusedAtExpiry > 0 or expired stock exists
  const hasExpiryRiskBeforeStockout = totalUnusedAtExpiryRisk > 0;

  return {
    totalBatches: batches.length,
    totalQuantity,
    expiredBatchesCount,
    expiredQuantity,
    nearExpiryBatchesCount,
    nearExpiryQuantity,
    totalUnusedAtExpiryRisk,
    hasExpiryRiskBeforeStockout,
    batches: evaluatedBatches,
  };
}

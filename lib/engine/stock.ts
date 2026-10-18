/**
 * Smart Health — Deterministic Stock & Burn Rate Calculations
 * 
 * Rules:
 * - Weighted 14-day consumption with linear decay: oldest day has weight 1, newest has weight 14.
 * - Days of stock: availableStock / burnRate.
 * - Zero burn rate returns null (with status NO_CONSUMPTION) to prevent division by zero.
 * - Expired batches (expiryDate <= currentDate) are strictly excluded from available stock.
 */

import {
  BurnRateResult,
  ConsumptionRecordInput,
  MedicineScope,
  StockBatchInput,
  StockCalculationResult,
  StockRiskStatus,
} from "./types";

/**
 * Parses YYYY-MM-DD string to UTC midnight epoch ms.
 */
function parseUtcDate(dateStr: string): number {
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid date format (expected YYYY-MM-DD): "${dateStr}"`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return Date.UTC(year, month, day);
}

/**
 * Formats epoch ms to YYYY-MM-DD string.
 */
function formatUtcDate(epochMs: number): string {
  const d = new Date(epochMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const MS_PER_DAY = 86_400_000;

/**
 * Calculates weighted average daily consumption over the last 14 days.
 * 
 * Linear Weighting Formula (Approved):
 * Day offset d in [0, 13] where d=0 is targetDate (most recent): weight = 14 - d.
 * Oldest day (d=13) has weight 1, most recent day (d=0) has weight 14.
 * 
 * Minimum valid data requirement: at least 3 distinct days of observations.
 */
export function calculateWeightedBurnRate(
  history: ConsumptionRecordInput[],
  targetDateStr?: string
): BurnRateResult {
  if (!history || history.length === 0) {
    return {
      rate: null,
      totalQuantity: 0,
      validDaysCount: 0,
      status: "INSUFFICIENT_DATA",
      weightsSum: 0,
      details: [],
    };
  }

  // Determine target date (default to latest date in history)
  let targetEpoch: number;
  if (targetDateStr) {
    targetEpoch = parseUtcDate(targetDateStr);
  } else {
    targetEpoch = Math.max(...history.map((h) => parseUtcDate(h.date)));
  }

  const windowStartEpoch = targetEpoch - 13 * MS_PER_DAY;

  // Aggregate multiple records on the same date and filter to 14-day window
  const dailyTotals = new Map<string, number>();

  for (const record of history) {
    const epoch = parseUtcDate(record.date);
    if (epoch >= windowStartEpoch && epoch <= targetEpoch) {
      const dateKey = formatUtcDate(epoch);
      const current = dailyTotals.get(dateKey) ?? 0;
      // Sanitize: reject negative consumption by clamping to 0
      const validQty = Math.max(0, record.quantity);
      dailyTotals.set(dateKey, current + validQty);
    }
  }

  const validDaysCount = dailyTotals.size;

  // Minimum data rule: require at least 3 distinct recorded days in the window
  if (validDaysCount < 3) {
    return {
      rate: null,
      totalQuantity: Array.from(dailyTotals.values()).reduce((a, b) => a + b, 0),
      validDaysCount,
      status: "INSUFFICIENT_DATA",
      weightsSum: 0,
      details: [],
    };
  }

  let weightedSum = 0;
  let weightsSum = 0;
  let totalQuantity = 0;
  const details: BurnRateResult["details"] = [];

  // Sort dates chronologically
  const sortedDates = Array.from(dailyTotals.keys()).sort();

  for (const dateKey of sortedDates) {
    const qty = dailyTotals.get(dateKey)!;
    const epoch = parseUtcDate(dateKey);
    const dayOffset = Math.round((targetEpoch - epoch) / MS_PER_DAY); // 0 to 13
    const weight = 14 - dayOffset; // 1 to 14

    weightedSum += qty * weight;
    weightsSum += weight;
    totalQuantity += qty;

    details.push({
      date: dateKey,
      quantity: qty,
      weight,
    });
  }

  if (totalQuantity === 0) {
    return {
      rate: 0,
      totalQuantity: 0,
      validDaysCount,
      status: "NO_CONSUMPTION",
      weightsSum,
      details,
    };
  }

  const rawRate = weightedSum / weightsSum;
  const rate = Math.round(rawRate * 100) / 100;

  return {
    rate,
    totalQuantity,
    validDaysCount,
    status: "VALID",
    weightsSum,
    details,
  };
}

/**
 * Classifies inventory risk based on Days of Stock Remaining and Medicine metadata.
 * 
 * Rules from Handoff 9.3:
 * - CRITICAL: daysOfStock < leadTimeDays
 * - WARNING:
 *     - If criticality >= 3: daysOfStock < 3 * leadTimeDays
 *     - Else: daysOfStock < 2 * leadTimeDays
 * - NORMAL: warningThreshold <= daysOfStock <= 45
 * - OVERSTOCKED: daysOfStock > 45
 */
export function classifyStockRisk(
  daysOfStock: number | null,
  medicine: MedicineScope
): StockRiskStatus {
  if (daysOfStock === null) {
    return "NO_CONSUMPTION";
  }

  if (daysOfStock <= 0) {
    return "OUT_OF_STOCK";
  }

  const leadTime = medicine.leadTimeDays > 0 ? medicine.leadTimeDays : 7;
  const criticalThreshold = leadTime;
  const warningThreshold =
    medicine.criticality >= 3 ? 3 * leadTime : 2 * leadTime;

  if (daysOfStock < criticalThreshold) {
    return "CRITICAL";
  }
  if (daysOfStock < warningThreshold) {
    return "WARNING";
  }
  if (daysOfStock <= 45) {
    return "NORMAL";
  }
  return "OVERSTOCKED";
}

/**
 * Computes available stock, batch exclusions, and days of stock remaining.
 * 
 * Invariants:
 * - Batches with expiryDate <= currentDate are excluded from available stock.
 * - Negative quantities are rejected / clamped to 0.
 * - Zero burn rate returns null for daysOfStock with status NO_CONSUMPTION.
 * - Zero stock returns daysOfStock = 0 with status OUT_OF_STOCK.
 */
export function calculateDaysOfStock(params: {
  stockBatches: StockBatchInput[];
  dailyBurnRate: number | null;
  medicine: MedicineScope;
  currentDate?: string;
}): StockCalculationResult {
  const { stockBatches, dailyBurnRate, medicine } = params;

  const currentEpoch = params.currentDate
    ? parseUtcDate(params.currentDate)
    : parseUtcDate(formatUtcDate(Date.now()));

  const nearExpiryThresholdEpoch = currentEpoch + 90 * MS_PER_DAY;

  let availableStock = 0;
  let expiredStock = 0;
  let nearExpiryStock = 0;

  for (const batch of stockBatches) {
    const qty = Math.max(0, batch.quantity);
    const expiryEpoch = parseUtcDate(batch.expiryDate);

    if (expiryEpoch <= currentEpoch) {
      // Expired batch: strictly excluded from available inventory
      expiredStock += qty;
    } else {
      availableStock += qty;
      if (expiryEpoch <= nearExpiryThresholdEpoch) {
        nearExpiryStock += qty;
      }
    }
  }

  const leadTime = medicine.leadTimeDays > 0 ? medicine.leadTimeDays : 7;
  const criticalThresholdDays = leadTime;
  const warningThresholdDays =
    medicine.criticality >= 3 ? 3 * leadTime : 2 * leadTime;

  // Zero stock condition
  if (availableStock === 0) {
    return {
      availableStock: 0,
      expiredStock,
      nearExpiryStock,
      dailyBurnRate,
      daysOfStock: 0,
      status: "OUT_OF_STOCK",
      criticalThresholdDays,
      warningThresholdDays,
    };
  }

  // Zero or missing burn rate condition: cannot divide by zero
  if (dailyBurnRate === null || dailyBurnRate <= 0) {
    return {
      availableStock,
      expiredStock,
      nearExpiryStock,
      dailyBurnRate,
      daysOfStock: null,
      status: "NO_CONSUMPTION",
      criticalThresholdDays,
      warningThresholdDays,
    };
  }

  const daysOfStock = Math.round((availableStock / dailyBurnRate) * 100) / 100;
  const status = classifyStockRisk(daysOfStock, medicine);

  return {
    availableStock,
    expiredStock,
    nearExpiryStock,
    dailyBurnRate,
    daysOfStock,
    status,
    criticalThresholdDays,
    warningThresholdDays,
  };
}

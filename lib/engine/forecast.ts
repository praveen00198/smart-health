/**
 * Smart Health — Deterministic 14-Day Demand Forecasting
 * 
 * Rules (Handoff 9.4):
 * - Baseline: 14-day weighted average daily consumption.
 * - Weekday multiplier factors derived from historical consumption.
 * - Approximate 80% confidence interval: +/- 1.28 * residual standard deviation.
 * - Forecast values are non-negative integers (clamped to >= 0).
 * - Pure TypeScript math; zero external LLM or network calls.
 */

import { ConsumptionRecordInput, Forecast14dDay, Forecast14dResult } from "./types";

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

/**
 * Computes deterministic 14-day demand forecast.
 */
export function forecast14d(params: {
  history: ConsumptionRecordInput[];
  baselineDailyRate: number | null;
  startDate?: string;
  surgeMultiplier?: number;
}): Forecast14dResult {
  const { history, baselineDailyRate } = params;
  const surge = params.surgeMultiplier && params.surgeMultiplier > 0 ? params.surgeMultiplier : 1.0;

  // Determine starting forecast date
  let startEpoch: number;
  if (params.startDate) {
    startEpoch = parseUtcDate(params.startDate);
  } else if (history && history.length > 0) {
    const latestHistoricalEpoch = Math.max(...history.map((h) => parseUtcDate(h.date)));
    startEpoch = latestHistoricalEpoch + MS_PER_DAY;
  } else {
    startEpoch = parseUtcDate(formatUtcDate(Date.now()));
  }

  // Handle zero or null baseline
  if (baselineDailyRate === null || baselineDailyRate <= 0) {
    const dailyForecasts: Forecast14dDay[] = [];
    for (let i = 0; i < 14; i++) {
      const epoch = startEpoch + i * MS_PER_DAY;
      const d = new Date(epoch);
      dailyForecasts.push({
        date: formatUtcDate(epoch),
        dayOfWeek: d.getUTCDay(),
        forecast: 0,
        lowerBound: 0,
        upperBound: 0,
      });
    }

    return {
      horizonDays: 14,
      baselineDailyRate: 0,
      surgeMultiplier: surge,
      residualStdDev: 0,
      dailyForecasts,
      totalForecast14d: 0,
      basis: "Baseline daily consumption is zero or insufficient; 14-day projected demand is zero.",
    };
  }

  // 1. Calculate Day-of-Week multipliers from history
  const dowBuckets = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
  let allSum = 0;
  let allCount = 0;

  for (const record of history) {
    const epoch = parseUtcDate(record.date);
    const dow = new Date(epoch).getUTCDay();
    const qty = Math.max(0, record.quantity);
    dowBuckets[dow].sum += qty;
    dowBuckets[dow].count += 1;
    allSum += qty;
    allCount += 1;
  }

  const overallMean = allCount > 0 ? allSum / allCount : baselineDailyRate;

  const dowMultipliers = dowBuckets.map((b) => {
    if (b.count > 0 && overallMean > 0) {
      const rawFactor = (b.sum / b.count) / overallMean;
      // Clamp factors to [0.3, 2.5] to prevent single abnormal spikes from heavily biasing
      return Math.min(2.5, Math.max(0.3, rawFactor));
    }
    return 1.0;
  });

  // 2. Compute residual standard deviation for the 80% confidence band (+/- 1.28 * sigma)
  let sumSquaredResiduals = 0;
  let residualCount = 0;

  for (const record of history) {
    const epoch = parseUtcDate(record.date);
    const dow = new Date(epoch).getUTCDay();
    const expected = baselineDailyRate * dowMultipliers[dow];
    const residual = record.quantity - expected;
    sumSquaredResiduals += residual * residual;
    residualCount += 1;
  }

  const residualVariance = residualCount > 1 ? sumSquaredResiduals / (residualCount - 1) : 0;
  const residualStdDev = Math.round(Math.sqrt(residualVariance) * 100) / 100;
  const zScore = 1.28; // Standard normal quantile for ~80% two-sided confidence interval

  // 3. Generate 14-day projection
  const dailyForecasts: Forecast14dDay[] = [];
  let totalForecast14d = 0;

  for (let i = 0; i < 14; i++) {
    const epoch = startEpoch + i * MS_PER_DAY;
    const dow = new Date(epoch).getUTCDay();
    const dowFactor = dowMultipliers[dow];

    const rawForecast = baselineDailyRate * dowFactor * surge;
    const forecast = Math.max(0, Math.round(rawForecast));

    const halfBand = zScore * residualStdDev;
    const lowerBound = Math.max(0, Math.round(forecast - halfBand));
    const upperBound = Math.max(forecast, Math.round(forecast + halfBand));

    dailyForecasts.push({
      date: formatUtcDate(epoch),
      dayOfWeek: dow,
      forecast,
      lowerBound,
      upperBound,
    });

    totalForecast14d += forecast;
  }

  const basis = surge !== 1.0
    ? `14-day forecast based on weighted burn rate (${baselineDailyRate}/day), historical day-of-week multipliers, and surge factor (${surge}x). 80% band: ±${Math.round(zScore * residualStdDev * 100) / 100}.`
    : `14-day forecast based on weighted burn rate (${baselineDailyRate}/day) and historical day-of-week multipliers. 80% band: ±${Math.round(zScore * residualStdDev * 100) / 100}.`;

  return {
    horizonDays: 14,
    baselineDailyRate,
    surgeMultiplier: surge,
    residualStdDev,
    dailyForecasts,
    totalForecast14d,
    basis,
  };
}

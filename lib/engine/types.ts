/**
 * Smart Health — Deterministic Engine Type Definitions
 * 
 * Strict TypeScript types for pure mathematical calculations.
 * Invariant: Independent of database, browser, Next.js, and LLM APIs.
 */

export interface StockBatchInput {
  batchNumber: string;
  quantity: number;
  expiryDate: string; // ISO date string: YYYY-MM-DD
}

export interface ConsumptionRecordInput {
  date: string; // ISO date string: YYYY-MM-DD
  quantity: number;
}

export interface MedicineScope {
  id?: string;
  name?: string;
  criticality: number; // 1, 2, or 3
  leadTimeDays: number;
  unit?: string;
}

export type StockRiskStatus =
  | "OUT_OF_STOCK"
  | "CRITICAL"
  | "WARNING"
  | "NORMAL"
  | "OVERSTOCKED"
  | "NO_CONSUMPTION"
  | "INSUFFICIENT_DATA";

export interface BurnRateDetail {
  date: string;
  quantity: number;
  weight: number;
}

export interface BurnRateResult {
  rate: number | null; // null if insufficient data
  totalQuantity: number;
  validDaysCount: number;
  status: "VALID" | "NO_CONSUMPTION" | "INSUFFICIENT_DATA";
  weightsSum: number;
  details: BurnRateDetail[];
}

export interface StockCalculationResult {
  availableStock: number;
  expiredStock: number;
  nearExpiryStock: number;
  dailyBurnRate: number | null;
  daysOfStock: number | null; // null if dailyBurnRate is 0 or null
  status: StockRiskStatus;
  criticalThresholdDays: number;
  warningThresholdDays: number;
}

export interface Forecast14dDay {
  date: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  forecast: number;
  lowerBound: number;
  upperBound: number;
}

export interface Forecast14dResult {
  horizonDays: number;
  baselineDailyRate: number;
  surgeMultiplier: number;
  residualStdDev: number;
  dailyForecasts: Forecast14dDay[];
  totalForecast14d: number;
  basis: string;
}

export interface BatchExpiryEvaluation {
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  status: "EXPIRED" | "NEAR_EXPIRY" | "SAFE";
  expectedConsumptionBeforeExpiry: number;
  estimatedUnusedAtExpiry: number;
}

export interface ExpiryRiskResult {
  totalBatches: number;
  totalQuantity: number;
  expiredBatchesCount: number;
  expiredQuantity: number;
  nearExpiryBatchesCount: number;
  nearExpiryQuantity: number;
  totalUnusedAtExpiryRisk: number;
  hasExpiryRiskBeforeStockout: boolean;
  batches: BatchExpiryEvaluation[];
}

export interface DonorCandidate {
  facilityId: string;
  facilityName: string;
  lat: number;
  lng: number;
  distanceKm: number;
  currentStock: number;
  dailyBurnRate: number;
  donorSafetyReserveDays: number;
  donorSafetyReserveUnits: number;
  maxTransferableUnits: number;
  proposedTransferUnits: number;
  remainingStockPostTransfer: number;
  remainingDaysPostTransfer: number;
  eligibleBatches: Array<{
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }>;
  rationale: {
    donorRetainsDays: number;
    distanceKm: number;
    targetShortfall: number;
    donorSurplusOverReserve: number;
  };
}

export interface RedistributionResult {
  recipientId: string;
  recipientName?: string;
  medicineId?: string;
  recipientStock: number;
  recipientBurnRate: number;
  recipientTargetDays: number;
  targetShortfallUnits: number;
  candidates: DonorCandidate[];
  status:
    | "RECOMMENDED"
    | "NO_SURPLUS_AVAILABLE"
    | "NO_RECIPIENT_DEFICIT"
    | "INVALID_INPUT";
}

export interface FacilityTelemetryInput {
  date: string;
  footfall: number;
  bedsOccupied: number;
  doctorsPresent: number;
  lastReportedAt: string; // ISO datetime string
  sanctionedDoctors: number;
  sanctionedBeds: number;
}

export interface DiagnosticTestInput {
  testName: string;
  isAvailable: boolean;
}

export interface HealthScoreComponentBreakdown {
  score: number; // 0-100
  weight: number; // e.g. 0.35
  weightedScore: number;
  details: string;
}

export interface FacilityHealthScoreResult {
  score: number; // 0-100
  status: "HEALTHY" | "UNDERPERFORMING";
  components: {
    stockAvailability: HealthScoreComponentBreakdown;
    doctorAttendance: HealthScoreComponentBreakdown;
    bedReadiness: HealthScoreComponentBreakdown;
    testAvailability: HealthScoreComponentBreakdown;
    dataFreshness: HealthScoreComponentBreakdown;
  };
  reasons: string[];
}

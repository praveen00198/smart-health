/**
 * Smart Health — Deterministic Inter-Facility Redistribution Matching
 * 
 * Rules (Handoff 9.5):
 * - Donor safety invariant: Donor must retain at least 21 days of stock post-transfer.
 * - Recipient target: 30 days of stock cover.
 * - Proposed quantity = min(donorSurplus, recipientShortfall).
 * - Never transfer expired stock (batches must have >= 30 days remaining shelf life).
 * - Distance calculation: Haversine formula.
 * - Rank candidates by distance ascending (top 3 returned).
 * - Recommends only; never directly creates database records or executes stock movements.
 */

import { DonorCandidate, MedicineScope, RedistributionResult, StockBatchInput } from "./types";

const MS_PER_DAY = 86_400_000;
const EARTH_RADIUS_KM = 6371;

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
 * Calculates great-circle distance between two geographic coordinates using Haversine formula.
 * Returns distance in kilometers rounded to 2 decimal places.
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

export interface RecipientInput {
  facilityId: string;
  facilityName: string;
  lat: number;
  lng: number;
  currentStock: number;
  dailyBurnRate: number;
}

export interface PotentialDonorInput {
  facilityId: string;
  facilityName: string;
  lat: number;
  lng: number;
  batches: StockBatchInput[];
  dailyBurnRate: number;
}

/**
 * Evaluates candidate donor facilities and finds top feasible redistribution options.
 */
export function findDonors(params: {
  recipient: RecipientInput;
  potentialDonors: PotentialDonorInput[];
  medicine?: MedicineScope;
  currentDate?: string;
  donorSafetyDays?: number;
  recipientTargetDays?: number;
}): RedistributionResult {
  const { recipient, potentialDonors } = params;

  const donorSafetyDays = params.donorSafetyDays ?? 21;
  const recipientTargetDays = params.recipientTargetDays ?? 30;

  const currentEpoch = params.currentDate
    ? parseUtcDate(params.currentDate)
    : parseUtcDate(formatUtcDate(Date.now()));

  // Minimum remaining shelf life for transferred batches: 30 days
  const minBatchExpiryEpoch = currentEpoch + 30 * MS_PER_DAY;

  // Validate recipient burn rate
  if (recipient.dailyBurnRate <= 0) {
    return {
      recipientId: recipient.facilityId,
      recipientName: recipient.facilityName,
      recipientStock: recipient.currentStock,
      recipientBurnRate: recipient.dailyBurnRate,
      recipientTargetDays,
      targetShortfallUnits: 0,
      candidates: [],
      status: "NO_RECIPIENT_DEFICIT",
    };
  }

  // Calculate recipient shortfall to reach target days of cover
  const targetStockNeeded = Math.ceil(recipient.dailyBurnRate * recipientTargetDays);
  const targetShortfallUnits = Math.max(0, targetStockNeeded - recipient.currentStock);

  if (targetShortfallUnits <= 0) {
    return {
      recipientId: recipient.facilityId,
      recipientName: recipient.facilityName,
      recipientStock: recipient.currentStock,
      recipientBurnRate: recipient.dailyBurnRate,
      recipientTargetDays,
      targetShortfallUnits: 0,
      candidates: [],
      status: "NO_RECIPIENT_DEFICIT",
    };
  }

  const feasibleCandidates: DonorCandidate[] = [];

  for (const donor of potentialDonors) {
    // Cannot donate to self
    if (donor.facilityId === recipient.facilityId) {
      continue;
    }

    // Filter donor batches with >= 30 days shelf life (FEFO sorted)
    const eligibleBatches = donor.batches
      .filter((b) => {
        const expiry = parseUtcDate(b.expiryDate);
        return b.quantity > 0 && expiry >= minBatchExpiryEpoch;
      })
      .sort((a, b) => parseUtcDate(a.expiryDate) - parseUtcDate(b.expiryDate));

    const totalEligibleStock = eligibleBatches.reduce((sum, b) => sum + b.quantity, 0);

    // Calculate donor safety reserve units
    const donorSafetyReserveUnits = Math.ceil(donor.dailyBurnRate * donorSafetyDays);
    const donorSurplus = totalEligibleStock - donorSafetyReserveUnits;

    // Donor must have surplus above the safety reserve
    if (donorSurplus <= 0) {
      continue;
    }

    const maxTransferableUnits = Math.floor(donorSurplus);
    const proposedTransferUnits = Math.min(maxTransferableUnits, targetShortfallUnits);

    if (proposedTransferUnits <= 0) {
      continue;
    }

    const remainingStockPostTransfer = totalEligibleStock - proposedTransferUnits;
    const remainingDaysPostTransfer =
      donor.dailyBurnRate > 0
        ? Math.round((remainingStockPostTransfer / donor.dailyBurnRate) * 10) / 10
        : 999;

    // Safety invariant check: donor post-transfer days MUST be >= safety days
    if (remainingDaysPostTransfer < donorSafetyDays) {
      continue;
    }

    const distanceKm = calculateHaversineDistance(
      recipient.lat,
      recipient.lng,
      donor.lat,
      donor.lng
    );

    feasibleCandidates.push({
      facilityId: donor.facilityId,
      facilityName: donor.facilityName,
      lat: donor.lat,
      lng: donor.lng,
      distanceKm,
      currentStock: totalEligibleStock,
      dailyBurnRate: donor.dailyBurnRate,
      donorSafetyReserveDays: donorSafetyDays,
      donorSafetyReserveUnits,
      maxTransferableUnits,
      proposedTransferUnits,
      remainingStockPostTransfer,
      remainingDaysPostTransfer,
      eligibleBatches: eligibleBatches.map((b) => ({
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
      })),
      rationale: {
        donorRetainsDays: remainingDaysPostTransfer,
        distanceKm,
        targetShortfall: targetShortfallUnits,
        donorSurplusOverReserve: maxTransferableUnits,
      },
    });
  }

  // Rank candidate donors primarily by distance ascending
  feasibleCandidates.sort((a, b) => a.distanceKm - b.distanceKm);

  // Return top 3 candidates
  const topCandidates = feasibleCandidates.slice(0, 3);

  return {
    recipientId: recipient.facilityId,
    recipientName: recipient.facilityName,
    medicineId: params.medicine?.id,
    recipientStock: recipient.currentStock,
    recipientBurnRate: recipient.dailyBurnRate,
    recipientTargetDays,
    targetShortfallUnits,
    candidates: topCandidates,
    status: topCandidates.length > 0 ? "RECOMMENDED" : "NO_SURPLUS_AVAILABLE",
  };
}

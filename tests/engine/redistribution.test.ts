import { describe, expect, it } from "vitest";
import {
  calculateHaversineDistance,
  findDonors,
  PotentialDonorInput,
  RecipientInput,
} from "@/lib/engine/redistribution";

describe("Deterministic Engine — Redistribution & Haversine Distance", () => {
  it("calculates accurate Haversine distance between coordinates", () => {
    // Sehore district approximate coordinates:
    // PHC Bilkisganj (22.980, 77.100) to CHC Ashta (23.020, 76.540)
    const distance = calculateHaversineDistance(22.98, 77.1, 23.02, 76.54);
    // Rough great-circle distance is ~57.6 km
    expect(distance).toBeGreaterThan(50);
    expect(distance).toBeLessThan(65);

    // Distance from point to itself is 0
    expect(calculateHaversineDistance(23.2, 77.0, 23.2, 77.0)).toBe(0);
  });

  it("strictly enforces donor safety reserve invariant (must retain >= 21 days post-transfer)", () => {
    // Recipient: PHC Bilkisganj (needs 30 days = 300 units, has 50 units -> shortfall = 250 units)
    const recipient: RecipientInput = {
      facilityId: "rec-1",
      facilityName: "PHC Bilkisganj",
      lat: 22.98,
      lng: 77.1,
      currentStock: 50,
      dailyBurnRate: 10,
    };

    // Donor: CHC Devgarh with 500 units, burn = 20/day
    // 21-day reserve = 420 units. Surplus = 500 - 420 = 80 units.
    const donor: PotentialDonorInput = {
      facilityId: "don-1",
      facilityName: "CHC Devgarh",
      lat: 22.95,
      lng: 77.05,
      dailyBurnRate: 20,
      batches: [
        { batchNumber: "B1", quantity: 500, expiryDate: "2027-06-01" },
      ],
    };

    const result = findDonors({
      recipient,
      potentialDonors: [donor],
      currentDate: "2026-10-18",
    });

    expect(result.status).toBe("RECOMMENDED");
    expect(result.candidates).toHaveLength(1);
    const candidate = result.candidates[0];

    // Even though recipient wants 250 units, donor can only transfer 80 units
    expect(candidate.maxTransferableUnits).toBe(80);
    expect(candidate.proposedTransferUnits).toBe(80);
    expect(candidate.remainingStockPostTransfer).toBe(420);
    expect(candidate.remainingDaysPostTransfer).toBe(21.0);
    expect(candidate.remainingDaysPostTransfer).toBeGreaterThanOrEqual(21.0);
  });

  it("tests donor safety reserve boundary conditions: just below, exactly at, and just above", () => {
    const recipient: RecipientInput = {
      facilityId: "rec-1",
      facilityName: "PHC Bilkisganj",
      lat: 22.98,
      lng: 77.1,
      currentStock: 20,
      dailyBurnRate: 10, // needs 280 units
    };

    // Daily burn = 10, 21-day reserve = 210 units
    // Donor A: 209 units (just below reserve)
    const donorBelow: PotentialDonorInput = {
      facilityId: "don-below",
      facilityName: "Donor Below",
      lat: 22.9,
      lng: 77.0,
      dailyBurnRate: 10,
      batches: [{ batchNumber: "B-BELOW", quantity: 209, expiryDate: "2027-01-01" }],
    };

    // Donor B: 210 units (exactly at reserve)
    const donorExact: PotentialDonorInput = {
      facilityId: "don-exact",
      facilityName: "Donor Exact",
      lat: 22.9,
      lng: 77.0,
      dailyBurnRate: 10,
      batches: [{ batchNumber: "B-EXACT", quantity: 210, expiryDate: "2027-01-01" }],
    };

    // Donor C: 215 units (just above reserve by 5 units)
    const donorAbove: PotentialDonorInput = {
      facilityId: "don-above",
      facilityName: "Donor Above",
      lat: 22.9,
      lng: 77.0,
      dailyBurnRate: 10,
      batches: [{ batchNumber: "B-ABOVE", quantity: 215, expiryDate: "2027-01-01" }],
    };

    const resBelow = findDonors({ recipient, potentialDonors: [donorBelow], currentDate: "2026-10-18" });
    expect(resBelow.candidates).toHaveLength(0);

    const resExact = findDonors({ recipient, potentialDonors: [donorExact], currentDate: "2026-10-18" });
    expect(resExact.candidates).toHaveLength(0);

    const resAbove = findDonors({ recipient, potentialDonors: [donorAbove], currentDate: "2026-10-18" });
    expect(resAbove.candidates).toHaveLength(1);
    expect(resAbove.candidates[0].proposedTransferUnits).toBe(5);
    expect(resAbove.candidates[0].remainingStockPostTransfer).toBe(210);
    expect(resAbove.candidates[0].remainingDaysPostTransfer).toBe(21.0);
  });

  it("returns NO_RECIPIENT_DEFICIT when recipient already has adequate stock (>= 30 days)", () => {
    const recipient: RecipientInput = {
      facilityId: "rec-full",
      facilityName: "Healthy PHC",
      lat: 22.98,
      lng: 77.1,
      currentStock: 350,
      dailyBurnRate: 10, // 350 / 10 = 35 days (target is 30 days)
    };

    const donor: PotentialDonorInput = {
      facilityId: "don-1",
      facilityName: "CHC Devgarh",
      lat: 22.95,
      lng: 77.05,
      dailyBurnRate: 5,
      batches: [{ batchNumber: "B1", quantity: 500, expiryDate: "2027-06-01" }],
    };

    const result = findDonors({ recipient, potentialDonors: [donor], currentDate: "2026-10-18" });
    expect(result.status).toBe("NO_RECIPIENT_DEFICIT");
    expect(result.targetShortfallUnits).toBe(0);
    expect(result.candidates).toHaveLength(0);
  });

  it("excludes donor batches expiring within 30 days from transferable stock", () => {
    const recipient: RecipientInput = {
      facilityId: "rec-1",
      facilityName: "PHC Bilkisganj",
      lat: 22.98,
      lng: 77.1,
      currentStock: 0,
      dailyBurnRate: 10,
    };

    const donorWithNearExpiry: PotentialDonorInput = {
      facilityId: "don-exp",
      facilityName: "Donor Near Expiry",
      lat: 22.95,
      lng: 77.05,
      dailyBurnRate: 5,
      batches: [
        { batchNumber: "EXP-SOON", quantity: 300, expiryDate: "2026-11-01" }, // only 14 days left (<30d)
        { batchNumber: "SAFE-BATCH", quantity: 150, expiryDate: "2027-08-01" }, // safe
      ],
    };

    // Donor safe stock = 150. Daily burn = 5. 21-day reserve = 105. Surplus = 45.
    const result = findDonors({
      recipient,
      potentialDonors: [donorWithNearExpiry],
      currentDate: "2026-10-18",
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].proposedTransferUnits).toBe(45);
    // EXP-SOON was excluded
    expect(result.candidates[0].eligibleBatches).toHaveLength(1);
    expect(result.candidates[0].eligibleBatches[0].batchNumber).toBe("SAFE-BATCH");
  });

  it("ranks candidates by distance ascending and limits output to top 3", () => {
    const recipient: RecipientInput = {
      facilityId: "rec-1",
      facilityName: "PHC Bilkisganj",
      lat: 23.0,
      lng: 77.0,
      currentStock: 0,
      dailyBurnRate: 10,
    };

    // 4 donors at increasing distances
    const donors: PotentialDonorInput[] = [
      {
        facilityId: "far",
        facilityName: "Far Facility (80km)",
        lat: 23.7,
        lng: 77.0,
        dailyBurnRate: 5,
        batches: [{ batchNumber: "B1", quantity: 500, expiryDate: "2027-01-01" }],
      },
      {
        facilityId: "closest",
        facilityName: "Closest Facility (5km)",
        lat: 23.04,
        lng: 77.0,
        dailyBurnRate: 5,
        batches: [{ batchNumber: "B2", quantity: 500, expiryDate: "2027-01-01" }],
      },
      {
        facilityId: "mid",
        facilityName: "Mid Facility (20km)",
        lat: 23.18,
        lng: 77.0,
        dailyBurnRate: 5,
        batches: [{ batchNumber: "B3", quantity: 500, expiryDate: "2027-01-01" }],
      },
      {
        facilityId: "super-far",
        facilityName: "Super Far Facility (150km)",
        lat: 24.3,
        lng: 77.0,
        dailyBurnRate: 5,
        batches: [{ batchNumber: "B4", quantity: 500, expiryDate: "2027-01-01" }],
      },
    ];

    const result = findDonors({ recipient, potentialDonors: donors, currentDate: "2026-10-18" });
    expect(result.candidates).toHaveLength(3); // capped at top 3
    expect(result.candidates[0].facilityId).toBe("closest");
    expect(result.candidates[1].facilityId).toBe("mid");
    expect(result.candidates[2].facilityId).toBe("far");
  });
});

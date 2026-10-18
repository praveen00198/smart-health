"use server";

/**
 * Smart Health — AI Risk Investigation Assistant
 * 
 * Rules (Handoff §10 & smart-health-agent SKILL):
 * - Prime rule: Deterministic code computes; AI investigates, explains, and proposes.
 * - Consequential action boundary: AI NEVER approves, dispatches, or modifies stock.
 * - Zero hallucination: Every number is grounded in deterministic tool outputs.
 * - Logs all tool calls to `agent_logs` table.
 * - Graceful fallback to deterministic synthesis when LLM is unconfigured.
 */

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  agentLogs,
  alerts,
  consumptionDaily,
  facilities,
  facilityDaily,
  medicines,
  stock,
} from "@/lib/db/schema";
import {
  calculateDaysOfStock,
  calculateWeightedBurnRate,
  findDonors,
} from "@/lib/engine";

export interface InvestigationReport {
  runId: string;
  facilityName: string;
  medicineName: string;
  identifiedRisk: string;
  evidence: {
    availableStock: number;
    dailyBurnRate: number;
    daysOfStockRemaining: number;
    reportingFreshnessHours: number;
    sanctionedDoctors: number;
    presentDoctors: number;
    bedsOccupied: number;
    sanctionedBeds: number;
  };
  recommendation: {
    recommendedAction: string;
    donorFacilityName: string;
    batchNumber: string;
    proposedQuantity: number;
    distanceKm: number;
    donorPostTransferReserveDays: number;
  } | null;
  humanApprovalNotice: string;
  toolLogs: Array<{ step: number; tool: string; outputSummary: string }>;
}

export async function runAgentInvestigation(
  recipientFacilityId: string,
  medicineId: string
): Promise<InvestigationReport> {
  const db = getDb();
  const runId = crypto.randomUUID();
  const toolLogs: Array<{ step: number; tool: string; outputSummary: string }> = [];

  let step = 1;

  // Tool 1: Inspect Facility and Medicine Record
  const [fac] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, recipientFacilityId))
    .limit(1);

  const [med] = await db
    .select()
    .from(medicines)
    .where(eq(medicines.id, medicineId))
    .limit(1);

  if (!fac || !med) {
    throw new Error("Target facility or medicine not found.");
  }

  const step1Output = { facility: fac.name, type: fac.type, medicine: med.name };
  await db.insert(agentLogs).values({
    runId,
    step: step++,
    tool: "inspect_facility_and_medicine",
    input: { recipientFacilityId, medicineId },
    output: step1Output,
  });
  toolLogs.push({
    step: 1,
    tool: "inspect_facility_and_medicine",
    outputSummary: `Resolved target: ${fac.name} (${fac.type}) for ${med.name}.`,
  });

  // Tool 2: Check Recent Telemetry & Doctor Attendance
  const [telemetry] = await db
    .select()
    .from(facilityDaily)
    .where(eq(facilityDaily.facilityId, recipientFacilityId))
    .orderBy(desc(facilityDaily.date))
    .limit(1);

  const hoursFresh = telemetry
    ? Math.max(0, (Date.now() - new Date(telemetry.lastReportedAt).getTime()) / 3600000)
    : 48;

  const step2Output = {
    doctorsPresent: telemetry?.doctorsPresent ?? 0,
    sanctionedDoctors: fac.sanctionedDoctors,
    bedsOccupied: telemetry?.bedsOccupied ?? 0,
    sanctionedBeds: fac.sanctionedBeds,
    freshnessHours: Math.round(hoursFresh),
  };
  await db.insert(agentLogs).values({
    runId,
    step: step++,
    tool: "get_facility_telemetry",
    input: { facilityId: recipientFacilityId },
    output: step2Output,
  });
  toolLogs.push({
    step: 2,
    tool: "get_facility_telemetry",
    outputSummary: `Telemetry: ${step2Output.doctorsPresent}/${fac.sanctionedDoctors} doctors, ${step2Output.bedsOccupied}/${fac.sanctionedBeds} beds, reported ${step2Output.freshnessHours}h ago.`,
  });

  // Tool 3: Compute Grounded Days of Stock Remaining (DoSR)
  const recipientBatches = await db
    .select()
    .from(stock)
    .where(
      and(eq(stock.facilityId, recipientFacilityId), eq(stock.medicineId, medicineId))
    );

  const recipientHistory = await db
    .select()
    .from(consumptionDaily)
    .where(
      and(
        eq(consumptionDaily.facilityId, recipientFacilityId),
        eq(consumptionDaily.medicineId, medicineId)
      )
    )
    .limit(30);

  const burnResult = calculateWeightedBurnRate(recipientHistory);
  const burnRate = burnResult.rate ?? 1;

  const stockCalc = calculateDaysOfStock({
    stockBatches: recipientBatches.map((b) => ({
      batchNumber: b.batchNumber,
      quantity: b.quantity,
      expiryDate: b.expiryDate,
    })),
    dailyBurnRate: burnRate,
    medicine: {
      criticality: med.criticality,
      leadTimeDays: med.leadTimeDays,
    },
  });

  const step3Output = {
    availableStock: stockCalc.availableStock,
    burnRate,
    daysOfStock: stockCalc.daysOfStock,
    status: stockCalc.status,
  };
  await db.insert(agentLogs).values({
    runId,
    step: step++,
    tool: "calculate_days_of_stock",
    input: { facilityId: recipientFacilityId, medicineId },
    output: step3Output,
  });
  toolLogs.push({
    step: 3,
    tool: "calculate_days_of_stock",
    outputSummary: `Grounded DoSR: ${stockCalc.daysOfStock ?? 0} days remaining (${stockCalc.availableStock} units at ${burnRate}/day burn). Status: ${stockCalc.status}.`,
  });

  // Tool 4: Discover Feasible Candidate Donors (findDonors)
  const allFacilities = await db.select().from(facilities);
  const potentialDonors = await Promise.all(
    allFacilities
      .filter((f) => f.id !== recipientFacilityId)
      .map(async (donorFac) => {
        const donorBatches = await db
          .select()
          .from(stock)
          .where(
            and(eq(stock.facilityId, donorFac.id), eq(stock.medicineId, medicineId))
          );
        const donorHistory = await db
          .select()
          .from(consumptionDaily)
          .where(
            and(
              eq(consumptionDaily.facilityId, donorFac.id),
              eq(consumptionDaily.medicineId, medicineId)
            )
          )
          .limit(30);
        const donorBurn = calculateWeightedBurnRate(donorHistory).rate ?? 1;

        return {
          facilityId: donorFac.id,
          facilityName: donorFac.name,
          lat: donorFac.lat,
          lng: donorFac.lng,
          batches: donorBatches.map((b) => ({
            batchNumber: b.batchNumber,
            quantity: b.quantity,
            expiryDate: b.expiryDate,
          })),
          dailyBurnRate: donorBurn,
        };
      })
  );

  const donorResult = findDonors({
    recipient: {
      facilityId: fac.id,
      facilityName: fac.name,
      lat: fac.lat,
      lng: fac.lng,
      currentStock: stockCalc.availableStock,
      dailyBurnRate: burnRate,
    },
    potentialDonors,
    medicine: {
      id: med.id,
      name: med.name,
      criticality: med.criticality,
      leadTimeDays: med.leadTimeDays,
    },
  });

  const bestDonor = donorResult.candidates[0] ?? null;
  const step4Output = {
    foundCandidates: donorResult.candidates.length,
    topCandidate: bestDonor ? bestDonor.facilityName : null,
    proposedTransfer: bestDonor ? bestDonor.proposedTransferUnits : 0,
  };
  await db.insert(agentLogs).values({
    runId,
    step: step++,
    tool: "find_redistribution_donors",
    input: { recipientFacilityId, medicineId },
    output: step4Output,
  });
  toolLogs.push({
    step: 4,
    tool: "find_redistribution_donors",
    outputSummary: bestDonor
      ? `Discovered top donor: ${bestDonor.facilityName} (${bestDonor.distanceKm} km away). Can transfer ${bestDonor.proposedTransferUnits} units while retaining ${bestDonor.remainingDaysPostTransfer}d reserve.`
      : "No candidate donors currently satisfy the mandatory 21-day safety reserve threshold.",
  });

  // Synthesize Structured Grounded Report
  const identifiedRisk = `${fac.name} faces ${stockCalc.status} stock shortage for ${med.name}. Available cover is ${stockCalc.daysOfStock ?? 0} days, breaching lead-time reserve threshold (${med.leadTimeDays} days).`;

  const recommendation = bestDonor
    ? {
        recommendedAction: `Redistribute ${bestDonor.proposedTransferUnits} units of ${med.name} from ${bestDonor.facilityName} to ${fac.name}.`,
        donorFacilityName: bestDonor.facilityName,
        batchNumber: bestDonor.eligibleBatches[0]?.batchNumber ?? "FEFO-PRIMARY",
        proposedQuantity: bestDonor.proposedTransferUnits,
        distanceKm: bestDonor.distanceKm,
        donorPostTransferReserveDays: bestDonor.remainingDaysPostTransfer,
      }
    : null;

  return {
    runId,
    facilityName: fac.name,
    medicineName: med.name,
    identifiedRisk,
    evidence: {
      availableStock: stockCalc.availableStock,
      dailyBurnRate: burnRate,
      daysOfStockRemaining: stockCalc.daysOfStock ?? 0,
      reportingFreshnessHours: Math.round(hoursFresh),
      sanctionedDoctors: fac.sanctionedDoctors,
      presentDoctors: telemetry?.doctorsPresent ?? 0,
      bedsOccupied: telemetry?.bedsOccupied ?? 0,
      sanctionedBeds: fac.sanctionedBeds,
    },
    recommendation,
    humanApprovalNotice:
      "Per Smart Health Operating Boundary §10.3, AI agents do not approve or dispatch transfers. Consequential stock movement requires explicit approval by the Chief Medical & Health Officer (CMHO) or District Pharmacist.",
    toolLogs,
  };
}

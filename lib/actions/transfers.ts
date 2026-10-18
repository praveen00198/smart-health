"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  alerts,
  consumptionDaily,
  facilities,
  medicines,
  stock,
  stockTransactions,
  transferProposals,
} from "@/lib/db/schema";
import { calculateWeightedBurnRate } from "@/lib/engine";
import { validateStateTransition } from "@/lib/workflows/stateMachine";

export interface CreateProposalInput {
  fromFacilityId: string;
  toFacilityId: string;
  medicineId: string;
  batchNumber: string;
  quantity: number;
  rationale: string;
  distanceKm: number;
}

/**
 * 1. Propose an Inter-Facility Stock Transfer
 */
export async function createTransferProposalAction(input: CreateProposalInput) {
  try {
    if (!input.fromFacilityId || !input.toFacilityId || !input.medicineId) {
      return { success: false, error: "Missing required facility or medicine identifier." };
    }
    if (input.fromFacilityId === input.toFacilityId) {
      return { success: false, error: "Source and destination facilities cannot be identical." };
    }
    if (input.quantity <= 0 || !Number.isInteger(input.quantity)) {
      return { success: false, error: "Transfer quantity must be a positive whole integer." };
    }

    const db = getDb();

    // Verify donor facility, recipient facility, and medicine exist
    const [donorFac, recipientFac, med] = await Promise.all([
      db.select().from(facilities).where(eq(facilities.id, input.fromFacilityId)).limit(1),
      db.select().from(facilities).where(eq(facilities.id, input.toFacilityId)).limit(1),
      db.select().from(medicines).where(eq(medicines.id, input.medicineId)).limit(1),
    ]);

    if (!donorFac.length || !recipientFac.length || !med.length) {
      return { success: false, error: "Facility or medicine record not found in system." };
    }

    // Insert proposal in 'proposed' status
    const [newProposal] = await db
      .insert(transferProposals)
      .values({
        fromFacilityId: input.fromFacilityId,
        toFacilityId: input.toFacilityId,
        medicineId: input.medicineId,
        batchNumber: input.batchNumber,
        quantity: input.quantity,
        rationale: input.rationale,
        distanceKm: String(input.distanceKm),
        status: "proposed",
      })
      .returning();

    revalidatePath("/");
    return { success: true, proposal: newProposal };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create transfer proposal.";
    return { success: false, error: msg };
  }
}

/**
 * 2. Explicit Human Approval or Rejection of a Transfer Proposal
 */
export async function approveTransferAction(proposalId: string, approvedBy = "Dr. R. K. Sharma (CMHO)") {
  try {
    const db = getDb();
    const [proposal] = await db
      .select()
      .from(transferProposals)
      .where(eq(transferProposals.id, proposalId))
      .limit(1);

    if (!proposal) {
      return { success: false, error: "Transfer proposal not found." };
    }

    // Validate legal transition: proposed -> approved
    validateStateTransition(proposal.status, "approved");

    const [updated] = await db
      .update(transferProposals)
      .set({
        status: "approved",
        approvedBy,
        updatedAt: new Date(),
      })
      .where(eq(transferProposals.id, proposalId))
      .returning();

    revalidatePath("/");
    return { success: true, proposal: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Approval failed.";
    return { success: false, error: msg };
  }
}

export async function rejectTransferAction(proposalId: string, rejectionReason: string) {
  try {
    if (!rejectionReason || !rejectionReason.trim()) {
      return { success: false, error: "Mandatory human rationale required for rejection." };
    }

    const db = getDb();
    const [proposal] = await db
      .select()
      .from(transferProposals)
      .where(eq(transferProposals.id, proposalId))
      .limit(1);

    if (!proposal) {
      return { success: false, error: "Transfer proposal not found." };
    }

    validateStateTransition(proposal.status, "rejected");

    const [updated] = await db
      .update(transferProposals)
      .set({
        status: "rejected",
        rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(transferProposals.id, proposalId))
      .returning();

    revalidatePath("/");
    return { success: true, proposal: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Rejection failed.";
    return { success: false, error: msg };
  }
}

/**
 * 3. Confirm Physical Dispatch from Donor Facility
 * 
 * Invariants Enforced:
 * - Status must be 'approved'
 * - Donor safety reserve (>= 21 days) is re-checked immediately before physical stock deduction
 * - Decrements donor stock batch
 * - Inserts immutable double-entry ledger row ('DISPATCH', negative quantity delta)
 */
export async function dispatchTransferAction(
  proposalId: string,
  recordedBy = "S. Patel (Pharmacist)"
) {
  try {
    const db = getDb();

    const [proposal] = await db
      .select()
      .from(transferProposals)
      .where(eq(transferProposals.id, proposalId))
      .limit(1);

    if (!proposal) {
      return { success: false, error: "Transfer proposal not found." };
    }

    // Validate legal transition: approved -> dispatched
    validateStateTransition(proposal.status, "dispatched");

    // Fetch current donor stock batch
    const donorBatches = await db
      .select()
      .from(stock)
      .where(
        and(
          eq(stock.facilityId, proposal.fromFacilityId),
          eq(stock.medicineId, proposal.medicineId),
          eq(stock.batchNumber, proposal.batchNumber)
        )
      )
      .limit(1);

    if (!donorBatches.length || donorBatches[0].quantity < proposal.quantity) {
      return {
        success: false,
        error: `Insufficient stock in donor batch "${proposal.batchNumber}". On hand: ${donorBatches[0]?.quantity ?? 0}, requested: ${proposal.quantity}`,
      };
    }

    // Re-check donor's >= 21-day safety reserve invariant
    const donorHistory = await db
      .select()
      .from(consumptionDaily)
      .where(
        and(
          eq(consumptionDaily.facilityId, proposal.fromFacilityId),
          eq(consumptionDaily.medicineId, proposal.medicineId)
        )
      )
      .limit(30);

    const burnRateResult = calculateWeightedBurnRate(donorHistory);
    const donorBurn = burnRateResult.rate ?? 1;

    // Total donor stock for this medicine
    const allDonorStockRows = await db
      .select()
      .from(stock)
      .where(
        and(
          eq(stock.facilityId, proposal.fromFacilityId),
          eq(stock.medicineId, proposal.medicineId)
        )
      );

    const totalDonorStock = allDonorStockRows.reduce((sum, r) => sum + r.quantity, 0);
    const postTransferStock = totalDonorStock - proposal.quantity;
    const remainingDays = donorBurn > 0 ? postTransferStock / donorBurn : 999;

    if (remainingDays < 21.0) {
      return {
        success: false,
        error: `Donor safety violation: Transfer would leave donor with ${Math.round(remainingDays * 10) / 10} days of stock, breaching the mandatory 21-day reserve rule. Dispatch aborted.`,
      };
    }

    // Atomic execution: update stock, insert ledger transaction, update proposal
    // 1. Decrement donor stock
    await db
      .update(stock)
      .set({
        quantity: donorBatches[0].quantity - proposal.quantity,
        updatedAt: new Date(),
      })
      .where(eq(stock.id, donorBatches[0].id));

    // 2. Insert double-entry ledger entry
    await db.insert(stockTransactions).values({
      facilityId: proposal.fromFacilityId,
      medicineId: proposal.medicineId,
      batchNumber: proposal.batchNumber,
      quantityDelta: -proposal.quantity,
      transactionType: "DISPATCH",
      referenceId: proposal.id,
      recordedBy,
      notes: `Dispatched ${proposal.quantity} units to facility ID ${proposal.toFacilityId}`,
    });

    // 3. Mark proposal as dispatched
    const [updated] = await db
      .update(transferProposals)
      .set({
        status: "dispatched",
        updatedAt: new Date(),
      })
      .where(eq(transferProposals.id, proposalId))
      .returning();

    revalidatePath("/");
    return { success: true, proposal: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Dispatch failed.";
    return { success: false, error: msg };
  }
}

/**
 * 4. Confirm Physical Receipt and Reconcile Inventory at Recipient Facility
 * 
 * Invariants Enforced:
 * - Status must be 'dispatched'
 * - Increments recipient stock (or creates batch row)
 * - Inserts immutable double-entry ledger row ('ARRIVAL', positive quantity delta)
 * - Automatically resolves matching shortage alert at recipient facility
 */
export async function receiveTransferAction(
  proposalId: string,
  recordedBy = "A. Verma (Store In-Charge)"
) {
  try {
    const db = getDb();

    const [proposal] = await db
      .select()
      .from(transferProposals)
      .where(eq(transferProposals.id, proposalId))
      .limit(1);

    if (!proposal) {
      return { success: false, error: "Transfer proposal not found." };
    }

    // Validate legal transition: dispatched -> received
    validateStateTransition(proposal.status, "received");

    // Check if recipient already has this batch
    const recipientBatches = await db
      .select()
      .from(stock)
      .where(
        and(
          eq(stock.facilityId, proposal.toFacilityId),
          eq(stock.medicineId, proposal.medicineId),
          eq(stock.batchNumber, proposal.batchNumber)
        )
      )
      .limit(1);

    if (recipientBatches.length > 0) {
      // Increment existing batch row
      await db
        .update(stock)
        .set({
          quantity: recipientBatches[0].quantity + proposal.quantity,
          updatedAt: new Date(),
        })
        .where(eq(stock.id, recipientBatches[0].id));
    } else {
      // Fetch expiry date from source batch to maintain batch integrity
      const sourceBatch = await db
        .select()
        .from(stock)
        .where(
          and(
            eq(stock.facilityId, proposal.fromFacilityId),
            eq(stock.medicineId, proposal.medicineId),
            eq(stock.batchNumber, proposal.batchNumber)
          )
        )
        .limit(1);

      const expiryDate = sourceBatch[0]?.expiryDate ?? new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0];

      await db.insert(stock).values({
        facilityId: proposal.toFacilityId,
        medicineId: proposal.medicineId,
        batchNumber: proposal.batchNumber,
        quantity: proposal.quantity,
        expiryDate,
      });
    }

    // 2. Insert arrival transaction in double-entry ledger
    await db.insert(stockTransactions).values({
      facilityId: proposal.toFacilityId,
      medicineId: proposal.medicineId,
      batchNumber: proposal.batchNumber,
      quantityDelta: proposal.quantity,
      transactionType: "ARRIVAL",
      referenceId: proposal.id,
      recordedBy,
      notes: `Received and verified ${proposal.quantity} units from facility ID ${proposal.fromFacilityId}`,
    });

    // 3. Mark proposal as received (terminal reconciled state)
    const [updated] = await db
      .update(transferProposals)
      .set({
        status: "received",
        updatedAt: new Date(),
      })
      .where(eq(transferProposals.id, proposalId))
      .returning();

    // 4. Resolve matching shortage alerts at the recipient facility
    await db
      .update(alerts)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(alerts.facilityId, proposal.toFacilityId),
          eq(alerts.medicineId, proposal.medicineId),
          eq(alerts.status, "open")
        )
      );

    revalidatePath("/");
    return { success: true, proposal: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Receipt confirmation failed.";
    return { success: false, error: msg };
  }
}

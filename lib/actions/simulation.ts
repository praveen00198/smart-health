"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  alerts,
  facilities,
  medicines,
  stock,
  stockTransactions,
  transferProposals,
} from "@/lib/db/schema";
import {
  approveTransferAction,
  createTransferProposalAction,
  dispatchTransferAction,
  receiveTransferAction,
} from "@/lib/actions/transfers";

import { STORYLINE_STEPS, SimulationStepInfo } from "@/lib/simulation/storyline";

const RAMPUR_ID = "11111111-1111-4111-a111-000000000001";
const DEVGARH_ID = "11111111-1111-4111-a111-000000000002";
const ORS_ID = "22222222-2222-4222-b222-000000000001";

/**
 * Executes a specific simulation day transition deterministically in the database.
 */
export async function executeSimulationStepAction(stepNumber: number) {
  try {
    const db = getDb();

    if (stepNumber === 1) {
      // Day 1: Clean Baseline reset
      return await resetSimulationAction();
    } else if (stepNumber === 2) {
      // Day 2: Surge draws down to 70 units
      // Clean up any in-flight transfers if jumping backward from later days
      await cleanupSimulationTransfers(db);

      await db
        .update(stock)
        .set({ quantity: 70, updatedAt: new Date() })
        .where(
          and(
            eq(stock.facilityId, RAMPUR_ID),
            eq(stock.medicineId, ORS_ID),
            eq(stock.batchNumber, "B-ORA-2026-RA")
          )
        );

      await db
        .update(stock)
        .set({ quantity: 650, updatedAt: new Date() })
        .where(
          and(
            eq(stock.facilityId, DEVGARH_ID),
            eq(stock.medicineId, ORS_ID),
            eq(stock.batchNumber, "B-ORA-2026-DE")
          )
        );

      await db
        .update(alerts)
        .set({ status: "open", severity: "warning", escalated: false })
        .where(and(eq(alerts.facilityId, RAMPUR_ID), eq(alerts.medicineId, ORS_ID)));
    } else if (stepNumber === 3) {
      // Day 3: Critical drop to 25 units, severity escalated
      await cleanupSimulationTransfers(db);

      await db
        .update(stock)
        .set({ quantity: 25, updatedAt: new Date() })
        .where(
          and(
            eq(stock.facilityId, RAMPUR_ID),
            eq(stock.medicineId, ORS_ID),
            eq(stock.batchNumber, "B-ORA-2026-RA")
          )
        );

      await db
        .update(stock)
        .set({ quantity: 650, updatedAt: new Date() })
        .where(
          and(
            eq(stock.facilityId, DEVGARH_ID),
            eq(stock.medicineId, ORS_ID),
            eq(stock.batchNumber, "B-ORA-2026-DE")
          )
        );

      await db
        .update(alerts)
        .set({ status: "open", severity: "critical", escalated: true })
        .where(and(eq(alerts.facilityId, RAMPUR_ID), eq(alerts.medicineId, ORS_ID)));
    } else if (stepNumber === 4) {
      // Day 4: Draft Proposal (if not already drafted)
      await db
        .update(stock)
        .set({ quantity: 25, updatedAt: new Date() })
        .where(
          and(
            eq(stock.facilityId, RAMPUR_ID),
            eq(stock.medicineId, ORS_ID),
            eq(stock.batchNumber, "B-ORA-2026-RA")
          )
        );

      await db
        .update(stock)
        .set({ quantity: 650, updatedAt: new Date() })
        .where(
          and(
            eq(stock.facilityId, DEVGARH_ID),
            eq(stock.medicineId, ORS_ID),
            eq(stock.batchNumber, "B-ORA-2026-DE")
          )
        );

      await db
        .update(alerts)
        .set({ status: "open", severity: "critical", escalated: true })
        .where(and(eq(alerts.facilityId, RAMPUR_ID), eq(alerts.medicineId, ORS_ID)));

      const existing = await db
        .select()
        .from(transferProposals)
        .where(
          and(
            eq(transferProposals.fromFacilityId, DEVGARH_ID),
            eq(transferProposals.toFacilityId, RAMPUR_ID),
            eq(transferProposals.medicineId, ORS_ID)
          )
        )
        .limit(1);

      if (!existing.length) {
        await createTransferProposalAction({
          fromFacilityId: DEVGARH_ID,
          toFacilityId: RAMPUR_ID,
          medicineId: ORS_ID,
          batchNumber: "B-ORA-2026-DE",
          quantity: 200,
          distanceKm: 18.5,
          rationale: "Deterministic simulation: 200 units ORS redistribution to resolve Rampur monsoon stockout. CHC Devgarh retains 22.5d reserve.",
        });
      }
    } else if (stepNumber === 5) {
      // Day 5: Human Approval & Dispatch (Idempotent)
      const proposals = await db
        .select()
        .from(transferProposals)
        .where(
          and(
            eq(transferProposals.fromFacilityId, DEVGARH_ID),
            eq(transferProposals.toFacilityId, RAMPUR_ID),
            eq(transferProposals.medicineId, ORS_ID)
          )
        )
        .limit(1);

      if (proposals.length > 0) {
        const prop = proposals[0];
        if (prop.status === "proposed") {
          await approveTransferAction(prop.id, "Dr. R. K. Sharma (CMHO)");
          await dispatchTransferAction(prop.id, "S. Patel (Pharmacist)");
        } else if (prop.status === "approved") {
          await dispatchTransferAction(prop.id, "S. Patel (Pharmacist)");
        }
        // If already dispatched or received, do nothing (idempotent)
      }
    } else if (stepNumber === 6) {
      // Day 6: Confirm Receipt & Reconcile (Idempotent)
      const proposals = await db
        .select()
        .from(transferProposals)
        .where(
          and(
            eq(transferProposals.fromFacilityId, DEVGARH_ID),
            eq(transferProposals.toFacilityId, RAMPUR_ID),
            eq(transferProposals.medicineId, ORS_ID)
          )
        )
        .limit(1);

      if (proposals.length > 0) {
        const prop = proposals[0];
        if (prop.status === "dispatched") {
          await receiveTransferAction(prop.id, "A. Verma (Store In-Charge)");
        }
      }
    }

    revalidatePath("/");
    return { success: true, step: STORYLINE_STEPS[stepNumber] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Simulation step execution failed.";
    return { success: false, error: msg };
  }
}

/**
 * Internal helper to safely clean up simulation transfer records and revert donor/recipient stock.
 */
async function cleanupSimulationTransfers(db: ReturnType<typeof getDb>) {
  // Delete transferred batch at Rampur if it exists
  await db
    .delete(stock)
    .where(
      and(
        eq(stock.facilityId, RAMPUR_ID),
        eq(stock.medicineId, ORS_ID),
        eq(stock.batchNumber, "B-ORA-2026-DE")
      )
    );

  // Clean up simulation transfer proposals and related ledger transactions
  const simProposals = await db
    .select()
    .from(transferProposals)
    .where(
      and(
        eq(transferProposals.fromFacilityId, DEVGARH_ID),
        eq(transferProposals.toFacilityId, RAMPUR_ID),
        eq(transferProposals.medicineId, ORS_ID)
      )
    );

  for (const p of simProposals) {
    await db.delete(stockTransactions).where(eq(stockTransactions.referenceId, p.id));
    await db.delete(transferProposals).where(eq(transferProposals.id, p.id));
  }
}

/**
 * Resets the demo storyline safely to Baseline (Day 1) without wiping the database.
 */
export async function resetSimulationAction() {
  try {
    const db = getDb();

    // 1. Clean up transfer records and any transferred arrival batches
    await cleanupSimulationTransfers(db);

    // 2. Reset Rampur primary stock to baseline (120 units)
    await db
      .update(stock)
      .set({ quantity: 120, updatedAt: new Date() })
      .where(
        and(
          eq(stock.facilityId, RAMPUR_ID),
          eq(stock.medicineId, ORS_ID),
          eq(stock.batchNumber, "B-ORA-2026-RA")
        )
      );

    // 3. Reset Devgarh primary stock to baseline (650 units)
    await db
      .update(stock)
      .set({ quantity: 650, updatedAt: new Date() })
      .where(
        and(
          eq(stock.facilityId, DEVGARH_ID),
          eq(stock.medicineId, ORS_ID),
          eq(stock.batchNumber, "B-ORA-2026-DE")
        )
      );

    // 4. Reset Rampur ORS alert to open warning
    await db
      .update(alerts)
      .set({ status: "open", severity: "warning", escalated: false })
      .where(and(eq(alerts.facilityId, RAMPUR_ID), eq(alerts.medicineId, ORS_ID)));

    revalidatePath("/");
    return { success: true, step: STORYLINE_STEPS[1] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Simulation reset failed.";
    return { success: false, error: msg };
  }
}

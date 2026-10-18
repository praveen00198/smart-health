/**
 * Smart Health — Transfer Lifecycle State Machine
 * 
 * Invariants (Handoff §5, §6, and smart-health-workflows SKILL):
 * - Legal transitions:
 *   PROPOSED -> APPROVED | REJECTED | CANCELLED
 *   APPROVED -> DISPATCHED | CANCELLED
 *   DISPATCHED -> RECEIVED
 * - Replays and skipped transitions are strictly rejected.
 * - Consequential actions require explicit human sign-off.
 */

export type TransferStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "dispatched"
  | "received"
  | "cancelled";

const LEGAL_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  proposed: ["approved", "rejected", "cancelled"],
  approved: ["dispatched", "cancelled"],
  dispatched: ["received"],
  rejected: [], // Terminal
  received: [], // Terminal (reconciled)
  cancelled: [], // Terminal
};

export class IllegalStateTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly requestedStatus: string,
    message?: string
  ) {
    super(
      message ||
        `Illegal transfer state transition from "${currentStatus}" to "${requestedStatus}".`
    );
    this.name = "IllegalStateTransitionError";
  }
}

/**
 * Checks if a transition between two transfer proposal statuses is legally permissible.
 */
export function isValidTransition(
  currentStatus: TransferStatus,
  nextStatus: TransferStatus
): boolean {
  const allowed = LEGAL_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(nextStatus));
}

/**
 * Validates a transfer state transition and throws an IllegalStateTransitionError if invalid.
 */
export function validateStateTransition(
  currentStatus: string,
  nextStatus: string
): void {
  const validCurrent = currentStatus as TransferStatus;
  const validNext = nextStatus as TransferStatus;

  if (!LEGAL_TRANSITIONS[validCurrent]) {
    throw new IllegalStateTransitionError(
      currentStatus,
      nextStatus,
      `Unknown current transfer status "${currentStatus}".`
    );
  }

  if (!isValidTransition(validCurrent, validNext)) {
    throw new IllegalStateTransitionError(
      currentStatus,
      nextStatus,
      `Cannot transition transfer proposal from "${currentStatus}" to "${nextStatus}". Permitted next states: [${LEGAL_TRANSITIONS[validCurrent].join(", ")}]`
    );
  }
}

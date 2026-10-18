import { describe, expect, it } from "vitest";
import {
  IllegalStateTransitionError,
  isValidTransition,
  validateStateTransition,
} from "@/lib/workflows/stateMachine";

describe("Smart Health — Transfer Lifecycle State Machine", () => {
  it("allows legal forward progression: proposed -> approved -> dispatched -> received", () => {
    expect(isValidTransition("proposed", "approved")).toBe(true);
    expect(isValidTransition("approved", "dispatched")).toBe(true);
    expect(isValidTransition("dispatched", "received")).toBe(true);
  });

  it("allows terminal branches: proposed -> rejected, proposed -> cancelled", () => {
    expect(isValidTransition("proposed", "rejected")).toBe(true);
    expect(isValidTransition("proposed", "cancelled")).toBe(true);
    expect(isValidTransition("approved", "cancelled")).toBe(true);
  });

  it("rejects illegal skips: proposed directly to dispatched or received", () => {
    expect(isValidTransition("proposed", "dispatched")).toBe(false);
    expect(isValidTransition("proposed", "received")).toBe(false);

    expect(() => validateStateTransition("proposed", "dispatched")).toThrow(
      IllegalStateTransitionError
    );
    expect(() => validateStateTransition("proposed", "received")).toThrow(
      IllegalStateTransitionError
    );
  });

  it("rejects replaying transitions or backward transitions", () => {
    expect(isValidTransition("dispatched", "dispatched")).toBe(false);
    expect(isValidTransition("dispatched", "approved")).toBe(false);
    expect(isValidTransition("dispatched", "proposed")).toBe(false);
    expect(isValidTransition("received", "dispatched")).toBe(false);
    expect(isValidTransition("rejected", "approved")).toBe(false);
  });

  it("treats received, rejected, and cancelled as terminal states", () => {
    const nextStates = ["proposed", "approved", "rejected", "dispatched", "received", "cancelled"] as const;
    for (const next of nextStates) {
      expect(isValidTransition("received", next)).toBe(false);
      expect(isValidTransition("rejected", next)).toBe(false);
      expect(isValidTransition("cancelled", next)).toBe(false);
    }
  });
});

"use client";

import React, { useState } from "react";
import { createTransferProposalAction } from "@/lib/actions/transfers";
import { RedistributionResult } from "@/lib/engine";

export function RedistributionPreview({
  previews,
}: {
  previews: RedistributionResult[];
}) {
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (!previews || previews.length === 0) {
    return null;
  }

  const handleDraftProposal = async (preview: RedistributionResult, candidateIdx: number) => {
    const cand = preview.candidates[candidateIdx];
    const key = `${preview.recipientId}-${cand.facilityId}`;
    setSubmittingKey(key);
    setFeedback(null);

    const primaryBatch = cand.eligibleBatches[0]?.batchNumber ?? "FEFO-PRIMARY";

    const res = await createTransferProposalAction({
      fromFacilityId: cand.facilityId,
      toFacilityId: preview.recipientId,
      medicineId: preview.medicineId || "00000000-0000-0000-0000-000000000000",
      batchNumber: primaryBatch,
      quantity: cand.proposedTransferUnits,
      distanceKm: cand.distanceKm,
      rationale: `Deterministic redistribution: ${cand.proposedTransferUnits} units requested to address deficit. Donor retains ${cand.remainingDaysPostTransfer} days reserve.`,
    });

    setSubmittingKey(null);

    if (res.success) {
      setFeedback({
        type: "success",
        message: `Proposal created successfully! ${cand.proposedTransferUnits} units from ${cand.facilityName} to ${preview.recipientName}. Awaiting CMHO approval below.`,
      });
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Failed to draft proposal.",
      });
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded overflow-hidden">
      <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
              Deterministic Redistribution Intelligence
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              Evaluated: Road distance · FEFO batch shelf-life · ≥21-day donor safety reserve
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
          ENGINE_RECOMMENDER
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs font-semibold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
              : "bg-rose-50 text-rose-800 border-b border-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="p-5 space-y-6">
        {previews.map((preview, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                  Critical Shortage Recipient
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {preview.recipientName}
                </h3>
              </div>
              <div className="text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-3">
                <span>Current Stock: <strong>{preview.recipientStock} units</strong></span>
                <span>·</span>
                <span>Burn Rate: <strong>{preview.recipientBurnRate}/day</strong></span>
                <span>·</span>
                <span className="text-rose-600 font-bold">Target Deficit: {preview.targetShortfallUnits} units</span>
              </div>
            </div>

            {/* Candidate Donors */}
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Top Feasible Donor Facilities (Ranked by Road Distance)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {preview.candidates.map((cand, cIdx) => {
                  const key = `${preview.recipientId}-${cand.facilityId}`;
                  const isSubmitting = submittingKey === key;

                  return (
                    <div
                      key={cIdx}
                      className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs hover:border-teal-300 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            #{cIdx + 1} {cand.facilityName}
                          </span>
                          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                            {cand.distanceKm} km
                          </span>
                        </div>
                        <div className="mt-2 text-xs space-y-1 text-slate-600">
                          <p>Transferable Surplus: <strong className="text-slate-900">{cand.maxTransferableUnits} units</strong></p>
                          <p>Proposed Transfer: <strong className="text-teal-700 font-bold">{cand.proposedTransferUnits} units</strong></p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 font-medium">
                          Retains {cand.remainingDaysPostTransfer}d reserve (≥ 21d)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDraftProposal(preview, cIdx)}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {isSubmitting ? "Drafting..." : "Draft Proposal →"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

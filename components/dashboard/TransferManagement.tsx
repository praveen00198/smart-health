"use client";

import React, { useState } from "react";
import {
  approveTransferAction,
  dispatchTransferAction,
  receiveTransferAction,
  rejectTransferAction,
} from "@/lib/actions/transfers";
import { DashboardData } from "@/lib/data/dashboard";

type DemoRole = "ALL" | "CMHO" | "PHARMACIST" | "STORE_INCHARGE";

export function TransferManagement({
  transfers,
}: {
  transfers: DashboardData["pendingTransfers"];
}) {
  const [activeRole, setActiveRole] = useState<DemoRole>("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    setFeedback(null);
    const res = await approveTransferAction(id, "Dr. R. K. Sharma (CMHO)");
    setLoadingId(null);
    if (res.success) {
      setFeedback({ type: "success", message: "Transfer proposal approved by CMHO. Ready for source dispatch." });
    } else {
      setFeedback({ type: "error", message: res.error || "Approval failed." });
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter mandatory human reason for rejection:");
    if (!reason) return;
    setLoadingId(id);
    setFeedback(null);
    const res = await rejectTransferAction(id, reason);
    setLoadingId(null);
    if (res.success) {
      setFeedback({ type: "success", message: "Transfer proposal rejected." });
    } else {
      setFeedback({ type: "error", message: res.error || "Rejection failed." });
    }
  };

  const handleDispatch = async (id: string) => {
    setLoadingId(id);
    setFeedback(null);
    const res = await dispatchTransferAction(id, "S. Patel (Pharmacist)");
    setLoadingId(null);
    if (res.success) {
      setFeedback({
        type: "success",
        message: "Stock dispatched! Donor stock decremented and logged in double-entry ledger. In-Transit.",
      });
    } else {
      setFeedback({ type: "error", message: res.error || "Dispatch failed." });
    }
  };

  const handleReceive = async (id: string) => {
    setLoadingId(id);
    setFeedback(null);
    const res = await receiveTransferAction(id, "A. Verma (Store In-Charge)");
    setLoadingId(null);
    if (res.success) {
      setFeedback({
        type: "success",
        message: "Physical receipt confirmed! Recipient inventory credited and shortage alert resolved.",
      });
    } else {
      setFeedback({ type: "error", message: res.error || "Receipt confirmation failed." });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Transfer Proposals & Stock Movement Lifecycle
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict State Machine: Proposed → Approved → Dispatched → Received (Reconciled)
          </p>
        </div>

        {/* Demo Persona Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="demo-role-select" className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
              Demo Persona:
            </label>
            <select
              id="demo-role-select"
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as DemoRole)}
              className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-semibold focus:outline-teal-600 cursor-pointer"
            >
              <option value="ALL">All Personas (Facilitator)</option>
              <option value="CMHO">Dr. R. K. Sharma (CMHO — Approver)</option>
              <option value="PHARMACIST">S. Patel (Pharmacist — Dispatcher)</option>
              <option value="STORE_INCHARGE">A. Verma (Store In-Charge — Reconciler)</option>
            </select>
          </div>
          <span className="text-[10px] text-slate-400 italic">
            (Demo persona only — not production auth)
          </span>
        </div>
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

      {transfers.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          No active or historical transfer proposals. Use the Redistribution Intelligence card above to draft a proposal.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {transfers.map((t) => {
            const isLoading = loadingId === t.id;

            return (
              <div
                key={t.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        t.status === "received"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : t.status === "dispatched"
                          ? "bg-blue-100 text-blue-800 border border-blue-200 animate-pulse"
                          : t.status === "approved"
                          ? "bg-teal-100 text-teal-800 border border-teal-200"
                          : t.status === "rejected"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {t.fromFacilityName} → {t.toFacilityName}
                    </span>
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {t.quantity} units of {t.medicineName}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Rationale: <span className="text-slate-800 font-medium">{t.rationale}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Road Distance: {t.distanceKm} km · Proposal ID: {t.id}
                  </p>
                </div>

                {/* Workflow Consequential Action Controls with Role Enforcement */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {t.status === "proposed" && (
                    <>
                      {activeRole === "ALL" || activeRole === "CMHO" ? (
                        <>
                          <button
                            onClick={() => handleApprove(t.id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-700 text-white hover:bg-teal-800 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isLoading ? "Processing..." : "Approve (CMHO)"}
                          </button>
                          <button
                            onClick={() => handleReject(t.id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                          Awaiting CMHO Approval
                        </span>
                      )}
                    </>
                  )}

                  {t.status === "approved" && (
                    <>
                      {activeRole === "ALL" || activeRole === "PHARMACIST" ? (
                        <button
                          onClick={() => handleDispatch(t.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isLoading ? "Verifying Reserve..." : "Confirm Dispatch"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                          Awaiting Pharmacist Dispatch
                        </span>
                      )}
                    </>
                  )}

                  {t.status === "dispatched" && (
                    <>
                      {activeRole === "ALL" || activeRole === "STORE_INCHARGE" ? (
                        <button
                          onClick={() => handleReceive(t.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isLoading ? "Reconciling..." : "Confirm Receipt & Reconcile"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                          Awaiting Recipient Receipt
                        </span>
                      )}
                    </>
                  )}

                  {t.status === "received" && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      Reconciled in Ledger
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

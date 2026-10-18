"use client";

import React, { useState } from "react";
import { runAgentInvestigation, InvestigationReport } from "@/lib/agent/investigator";

export function AgentInvestigationPanel({
  targetFacilityId,
  targetMedicineId,
}: {
  targetFacilityId?: string;
  targetMedicineId?: string;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!targetFacilityId || !targetMedicineId) return;
    setIsRunning(true);
    setError(null);
    try {
      const rep = await runAgentInvestigation(targetFacilityId, targetMedicineId);
      setReport(rep);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Investigation failed.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded overflow-hidden">
      <div className="bg-slate-900 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-white gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
              Clinical & Operational Risk Diagnostic Agent
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              Tool-Bounded Grounded Analysis · Zero Hallucinations · Audit Logged in PostgreSQL
            </p>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning || !targetFacilityId}
          className="px-3 py-1 text-xs font-mono font-bold rounded bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          {isRunning ? (
            <>
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>RUNNING_DIAGNOSTICS...</span>
            </>
          ) : (
            <span>RUN DIAGNOSTIC (RAMPUR ORS) →</span>
          )}
        </button>
      </div>

      <div className="p-5">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-lg border border-rose-200 mb-4">
            {error}
          </div>
        )}

        {!report && !isRunning && (
          <div className="text-center py-6 text-slate-500 text-xs">
            Click <strong>Investigate Critical Risk</strong> above to trigger the tool-bounded AI agent investigation workflow. The agent will inspect live telemetry, calculate grounded days of stock, discover candidate donors, and persist execution logs in PostgreSQL.
          </div>
        )}

        {report && (
          <div className="space-y-5">
            {/* 1. Identified Risk */}
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                Identified Operational Risk
              </span>
              <p className="text-xs font-semibold text-rose-950 mt-1">
                {report.identifiedRisk}
              </p>
            </div>

            {/* 2. Tool Invocation Steps Logged */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Executed Tool Calls (Audit Logged to `agent_logs`)
              </span>
              <div className="space-y-1.5">
                {report.toolLogs.map((log) => (
                  <div
                    key={log.step}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-start gap-2.5"
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px]">
                      {log.step}
                    </span>
                    <div>
                      <span className="font-mono text-indigo-700 font-semibold">{log.tool}</span>
                      <p className="text-slate-600 mt-0.5">{log.outputSummary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Grounded Evidence Grid */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Grounded Numerical Evidence
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block uppercase">Available Stock</span>
                  <strong className="text-sm text-slate-900">{report.evidence.availableStock} units</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block uppercase">Burn Rate</span>
                  <strong className="text-sm text-slate-900">{report.evidence.dailyBurnRate}/day</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block uppercase">Doctors Present</span>
                  <strong className="text-sm text-slate-900">{report.evidence.presentDoctors}/{report.evidence.sanctionedDoctors}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block uppercase">Data Freshness</span>
                  <strong className="text-sm text-slate-900">{report.evidence.reportingFreshnessHours}h ago</strong>
                </div>
              </div>
            </div>

            {/* 4. Action Recommendation */}
            {report.recommendation && (
              <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 text-xs space-y-1">
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                  Agent Proposed Resolution
                </span>
                <p className="text-xs font-bold text-teal-950">
                  {report.recommendation.recommendedAction}
                </p>
                <p className="text-teal-800 text-[11px]">
                  Batch: {report.recommendation.batchNumber} · Distance: {report.recommendation.distanceKm} km · Donor post-transfer reserve: {report.recommendation.donorPostTransferReserveDays} days (≥ 21d rule satisfied).
                </p>
              </div>
            )}

            {/* 5. Human Approval Notice */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>Human-in-the-Loop Safeguard:</strong> {report.humanApprovalNotice}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

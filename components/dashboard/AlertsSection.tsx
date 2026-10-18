import React from "react";
import { DashboardData } from "@/lib/data/dashboard";

export function AlertsSection({ alerts }: { alerts: DashboardData["activeAlerts"] }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-xs">
        <p className="text-sm text-slate-500 font-medium">No active operational alerts across the district.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-300 rounded overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-600" />
          <h2 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
            Operational Alerts & Supply Shortages
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {alerts.length} ACTIVE_EVENTS
        </span>
      </div>

      <div className="divide-y divide-slate-200">
        {alerts.map((alert) => {
          const isCritical = alert.severity === "critical";
          const isWarning = alert.severity === "warning";

          return (
            <div
              key={alert.id}
              className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCritical ? "bg-rose-50/50" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded ${
                    isCritical
                      ? "bg-rose-700 text-white"
                      : isWarning
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}
                >
                  {alert.severity}
                </span>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      {alert.facilityName}
                    </span>
                    {alert.medicineName && (
                      <span className="text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        {alert.medicineName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">
                    {alert.message}
                  </p>
                  {alert.messageHi && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {alert.messageHi}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Ref: {alert.dedupeKey} · {new Date(alert.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs font-mono font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ACK
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

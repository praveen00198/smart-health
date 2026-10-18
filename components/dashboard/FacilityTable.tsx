import React from "react";
import { FacilityDashboardSummary } from "@/lib/data/dashboard";

export function FacilityTable({ facilities }: { facilities: FacilityDashboardSummary[] }) {
  return (
    <div className="bg-white border border-slate-300 rounded overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
            Facility Operational Status & Health Scores
          </h2>
          <p className="text-[11px] font-mono text-slate-500">
            10 Primary & Community Health Centres · Sehore District
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
          WEIGHTS: Stock (35%) · Staff (25%) · Beds (15%) · Diag (15%) · Freshness (10%)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-100 font-mono font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th scope="col" className="px-4 py-2.5">Facility</th>
              <th scope="col" className="px-3 py-2.5">Type & Block</th>
              <th scope="col" className="px-3 py-2.5">Health Score</th>
              <th scope="col" className="px-3 py-2.5">Doctors</th>
              <th scope="col" className="px-3 py-2.5">Beds</th>
              <th scope="col" className="px-3 py-2.5">Stock Status</th>
              <th scope="col" className="px-3 py-2.5">Freshness</th>
              <th scope="col" className="px-4 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {facilities.map((fac) => {
              const isUnderperforming = fac.healthScore.status === "UNDERPERFORMING";
              const score = fac.healthScore.score;

              return (
                <tr
                  key={fac.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isUnderperforming ? "bg-amber-50/20" : ""
                  }`}
                >
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {fac.name}
                    <div className="text-[11px] font-normal text-slate-400">
                      Pop: {fac.catchmentPopulation.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {fac.type}
                    </span>
                    <span className="text-slate-500 ml-1.5">{fac.block}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center font-bold rounded-md px-2 py-0.5 text-xs ${
                          score >= 80
                            ? "bg-emerald-100 text-emerald-800"
                            : score >= 60
                            ? "bg-teal-100 text-teal-800"
                            : "bg-rose-100 text-rose-800 font-extrabold"
                        }`}
                      >
                        {score}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">
                    {fac.telemetry ? (
                      <span>
                        <strong className={fac.telemetry.doctorsPresent < fac.sanctionedDoctors ? "text-amber-600" : ""}>
                          {fac.telemetry.doctorsPresent}
                        </strong>{" "}
                        / {fac.sanctionedDoctors}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">
                    {fac.telemetry ? (
                      <span>
                        <strong className={fac.telemetry.bedsOccupied >= fac.sanctionedBeds ? "text-rose-600" : ""}>
                          {fac.telemetry.bedsOccupied}
                        </strong>{" "}
                        / {fac.sanctionedBeds}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {fac.stockSummary.criticalCount > 0 && (
                        <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {fac.stockSummary.criticalCount} crit
                        </span>
                      )}
                      {fac.stockSummary.warningCount > 0 && (
                        <span className="text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {fac.stockSummary.warningCount} warn
                        </span>
                      )}
                      <span className="text-slate-500">
                        {fac.stockSummary.normalCount + fac.stockSummary.overstockedCount} ok
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                    {fac.healthScore.components.dataFreshness.score === 100 ? (
                      <span className="text-emerald-700 font-medium">&lt; 24h</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">&gt; 24h</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isUnderperforming
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {fac.healthScore.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

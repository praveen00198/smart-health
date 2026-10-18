import React from "react";
import { DashboardData } from "@/lib/data/dashboard";

export function DistrictKpis({ metrics }: { metrics: DashboardData["metrics"] }) {
  const cards = [
    {
      title: "Total Facilities",
      value: metrics.totalFacilities,
      subtitle: `${metrics.underperformingFacilitiesCount} underperforming flagged`,
      subColor: metrics.underperformingFacilitiesCount > 0 ? "text-amber-600 font-semibold" : "text-emerald-600",
      accent: "border-l-4 border-teal-600",
      iconBg: "bg-teal-50 text-teal-700",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: "Medicine Inventory Lines",
      value: metrics.totalStockLines,
      subtitle: `${metrics.criticalStockLinesCount} stockout / critical risk`,
      subColor: metrics.criticalStockLinesCount > 0 ? "text-rose-600 font-semibold" : "text-emerald-600",
      accent: "border-l-4 border-indigo-600",
      iconBg: "bg-indigo-50 text-indigo-700",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      title: "Active Operational Alerts",
      value: metrics.activeAlertsCount,
      subtitle: `${metrics.criticalAlertsCount} critical urgent alerts`,
      subColor: metrics.criticalAlertsCount > 0 ? "text-rose-600 font-semibold" : "text-slate-500",
      accent: "border-l-4 border-rose-600",
      iconBg: "bg-rose-50 text-rose-700",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      title: "Pending Transfers",
      value: metrics.pendingTransfersCount,
      subtitle: "Deterministic proposals awaiting CMHO sign-off",
      subColor: "text-slate-500",
      accent: "border-l-4 border-amber-500",
      iconBg: "bg-amber-50 text-amber-700",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-white p-3.5 border border-slate-300 rounded flex flex-col justify-between"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
              {card.title}
            </p>
            <span className="text-xl font-bold font-mono text-slate-900">
              {card.value}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <p className={`text-[11px] font-mono ${card.subColor}`}>{card.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { MedicineStockSummary } from "@/lib/data/dashboard";

export function InventoryOverview({ inventory }: { inventory: MedicineStockSummary[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.medicineName.toLowerCase().includes(search.toLowerCase()) ||
      item.facilityName.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === "ALL") return true;
    if (filterStatus === "CRITICAL") {
      return (
        item.stockCalculation.status === "CRITICAL" ||
        item.stockCalculation.status === "OUT_OF_STOCK"
      );
    }
    if (filterStatus === "WARNING") return item.stockCalculation.status === "WARNING";
    if (filterStatus === "NORMAL") return item.stockCalculation.status === "NORMAL";
    if (filterStatus === "OVERSTOCKED") return item.stockCalculation.status === "OVERSTOCKED";

    return true;
  });

  return (
    <div className="bg-white border border-slate-300 rounded overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
            Medicine Stock & Days of Supply (DoSR)
          </h2>
          <p className="text-[11px] font-mono text-slate-500">
            Computed by Pure Deterministic Engine · Excludes Expired Batches
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search medicine or facility..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-2.5 py-1 text-xs font-mono rounded border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-slate-800 w-48 sm:w-56"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2 py-1 text-xs font-mono rounded border border-slate-300 bg-white font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="CRITICAL">CRITICAL (&lt; Lead Time)</option>
            <option value="WARNING">WARNING (Low)</option>
            <option value="NORMAL">NORMAL</option>
            <option value="OVERSTOCKED">OVERSTOCKED</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[480px]">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-100 font-mono font-semibold text-slate-600 uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-300">
            <tr>
              <th scope="col" className="px-5 py-3">Medicine</th>
              <th scope="col" className="px-4 py-3">Facility</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3 text-right">Available Stock</th>
              <th scope="col" className="px-4 py-3 text-right">Burn Rate</th>
              <th scope="col" className="px-4 py-3 text-right">Days of Stock</th>
              <th scope="col" className="px-5 py-3 text-right">Risk Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.slice(0, 50).map((item, idx) => {
              const status = item.stockCalculation.status;
              const isCrit = status === "CRITICAL" || status === "OUT_OF_STOCK";
              const isWarn = status === "WARNING";

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isCrit ? "bg-rose-50/20" : isWarn ? "bg-amber-50/10" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-bold text-slate-900">
                    {item.medicineName}
                    <span className="text-[10px] ml-1.5 font-mono text-slate-400">
                      (Crit {item.criticality})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {item.facilityName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                    {item.stockCalculation.availableStock.toLocaleString()} {item.unit}
                    {item.stockCalculation.expiredStock > 0 && (
                      <span className="block text-[10px] text-rose-500">
                        ({item.stockCalculation.expiredStock} expired)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    {item.stockCalculation.dailyBurnRate !== null
                      ? `${item.stockCalculation.dailyBurnRate}/d`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span
                      className={`font-bold ${
                        isCrit
                          ? "text-rose-600"
                          : isWarn
                          ? "text-amber-600"
                          : "text-slate-800"
                      }`}
                    >
                      {item.stockCalculation.daysOfStock !== null
                        ? `${item.stockCalculation.daysOfStock}d`
                        : "No cons."}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        status === "CRITICAL" || status === "OUT_OF_STOCK"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : status === "WARNING"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : status === "NORMAL"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : status === "OVERSTOCKED"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
        <span>Showing {Math.min(filtered.length, 50)} of {filtered.length} inventory lines</span>
        <span className="text-[11px] text-slate-400">Deterministic calculation · Zero hallucinations</span>
      </div>
    </div>
  );
}

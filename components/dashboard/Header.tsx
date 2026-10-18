"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function Header({
  districtName,
  lastUpdated,
}: {
  districtName: string;
  lastUpdated: string;
}) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <header className="border-b border-slate-300 bg-white sticky top-0 z-30">
      {/* Top Strip: Synthetic Data Notice */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-1 text-[11px] font-mono text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600" />
          <span>
            <strong className="font-semibold text-slate-800">SIMULATED ENVIRONMENT:</strong> Synthetic Sehore District dataset · Demonstration model
          </span>
        </div>
        <span className="text-slate-500 hidden sm:inline">
          e-Aushadhi / NHM Operational Spec
        </span>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-slate-900 text-white font-mono font-bold text-sm flex items-center justify-center rounded">
            SH
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 uppercase font-mono">
                Smart Health Operations
              </h1>
              <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 rounded">
                DISTRICT CMHO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              {districtName} · Last Synced: {lastUpdated}
            </p>
          </div>
        </div>

        {/* Telemetry & Refresh */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-600 border-r border-slate-200 pr-3">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>DB_CONNECTED</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors disabled:opacity-50 cursor-pointer rounded"
          >
            <svg
              className={`h-3 w-3 text-slate-600 ${isRefreshing ? "animate-spin" : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>{isRefreshing ? "SYNCING" : "SYNC"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

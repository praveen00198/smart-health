"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  executeSimulationStepAction,
  resetSimulationAction,
} from "@/lib/actions/simulation";
import { STORYLINE_STEPS, SimulationStepInfo } from "@/lib/simulation/storyline";

const DEFAULT_STEP: SimulationStepInfo = {
  day: 1,
  phase: "Baseline",
  title: "District Baseline Operations",
  narrative: "Pre-monsoon operational baseline across Sehore District. PHC Rampur holds 120 units of ORS (~6 days of supply). Baseline warning alert active.",
  metricsSummary: "Rampur ORS: 120 units (6.0d) · Devgarh ORS: 650 units (32.5d) · Alert: Open (Warning)",
};

export function SimulationControlPanel() {
  const router = useRouter();
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const stepInfo = STORYLINE_STEPS?.[currentDay] ?? STORYLINE_STEPS?.[1] ?? DEFAULT_STEP;

  const handleStep = async (targetDay: number) => {
    if (targetDay < 1 || targetDay > 6 || isBusy) return;
    setIsBusy(true);
    setFeedback(null);

    const res = await executeSimulationStepAction(targetDay);
    setIsBusy(false);

    if (res.success) {
      setCurrentDay(targetDay);
      router.refresh();
    } else {
      setFeedback(res.error || "Simulation transition failed.");
    }
  };

  const handleReset = async () => {
    setIsPlaying(false);
    setIsBusy(true);
    setFeedback(null);

    const res = await resetSimulationAction();
    setIsBusy(false);

    if (res.success) {
      setCurrentDay(1);
      router.refresh();
      setFeedback("Demo reset to Baseline (Day 1). Ready for replay.");
    } else {
      setFeedback(res.error || "Reset failed.");
    }
  };

  // Auto-play interval: ~4 seconds per simulation day
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentDay((prev) => {
        if (prev >= 6) {
          setIsPlaying(false);
          return 6;
        }
        const next = prev + 1;
        executeSimulationStepAction(next).then((res) => {
          if (res.success) router.refresh();
        });
        return next;
      });
    }, 4200);

    return () => clearInterval(timer);
  }, [isPlaying, router]);

  return (
    <div className="bg-slate-900 rounded-lg p-4 text-white border border-slate-800 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Operational Clock & Status */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center h-10 w-12 rounded bg-slate-800 border border-slate-700 text-slate-100 font-mono">
            <span className="text-[9px] uppercase tracking-wider text-slate-400">DAY</span>
            <span className="text-lg font-bold leading-none">{currentDay.toString().padStart(2, "0")}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">
                {stepInfo.phase}
              </span>
              <h2 className="text-xs font-mono font-bold text-slate-100 tracking-wide uppercase">
                {stepInfo.title}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
              {stepInfo.narrative}
            </p>
          </div>
        </div>

        {/* Right: Operational Controls */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isBusy || currentDay >= 6}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 border ${
              isPlaying
                ? "bg-amber-600 border-amber-500 text-white hover:bg-amber-500"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {isPlaying ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>AUTO_PLAY</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleStep(currentDay + 1)}
            disabled={isBusy || isPlaying || currentDay >= 6}
            className="px-3 py-1.5 text-xs font-mono font-bold rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {isBusy ? "STEPPING..." : "NEXT DAY →"}
          </button>

          <button
            onClick={handleReset}
            disabled={isBusy}
            className="px-3 py-1.5 text-xs font-mono font-bold rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            ↺ RESET
          </button>
        </div>
      </div>

      {/* Storyline Stepper Timeline */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((dayNum) => {
            const step = STORYLINE_STEPS?.[dayNum] ?? DEFAULT_STEP;
            const isActive = currentDay === dayNum;
            const isCompleted = currentDay > dayNum;

            return (
              <button
                key={dayNum}
                onClick={() => handleStep(dayNum)}
                disabled={isBusy || isPlaying}
                className={`p-2 rounded text-left transition-all cursor-pointer font-mono border ${
                  isActive
                    ? "bg-slate-800 border-emerald-500 text-white"
                    : isCompleted
                    ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/60"
                    : "bg-slate-950/60 border-slate-900 text-slate-600 hover:text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
                  <span>DAY {dayNum.toString().padStart(2, "0")}</span>
                  {isCompleted && <span className="text-emerald-400 font-extrabold">✓</span>}
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </div>
                <div className="text-[11px] font-medium truncate text-slate-300">{step.phase}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Telemetry Readout Bar */}
      <div className="mt-2.5 bg-slate-950 px-3 py-1.5 rounded border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono">
        <span className="text-slate-300 font-semibold">{stepInfo.metricsSummary}</span>
        <span className="text-slate-500 text-[10px]">DETERMINISTIC_PRNG_SIMULATION</span>
      </div>

      {feedback && (
        <div className="mt-2 text-xs text-amber-300 bg-amber-950/60 p-2 rounded border border-amber-800/60">
          {feedback}
        </div>
      )}
    </div>
  );
}

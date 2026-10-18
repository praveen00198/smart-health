export interface SimulationStepInfo {
  day: number;
  phase: string;
  title: string;
  narrative: string;
  metricsSummary: string;
}

export const STORYLINE_STEPS: Record<number, SimulationStepInfo> = {
  1: {
    day: 1,
    phase: "Baseline",
    title: "District Baseline Operations",
    narrative: "Pre-monsoon operational baseline across Sehore District. PHC Rampur holds 120 units of ORS (~6 days of supply). Baseline warning alert active.",
    metricsSummary: "Rampur ORS: 120 units (6.0d) · Devgarh ORS: 650 units (32.5d) · Alert: Open (Warning)",
  },
  2: {
    day: 2,
    phase: "Monsoon Inset",
    title: "Monsoon Surge & Influx",
    narrative: "Heavy monsoon showers contaminate local water sources in Rampur block. Outpatient footfall spikes; daily ORS consumption accelerates. Stock draws down to 70 units (~2.8 days).",
    metricsSummary: "Rampur ORS: 70 units (2.8d) · Burn rate surges to 25/day · Alert: Approaching Critical",
  },
  3: {
    day: 3,
    phase: "Shortage Escalation",
    title: "Critical Stockout Warning",
    narrative: "Rampur on-hand inventory drops to 25 units (< 1.2 days). Lead-time threshold breached. Operational alert escalates to CRITICAL on district dashboard.",
    metricsSummary: "Rampur ORS: 25 units (1.0d) · Status: CRITICAL · Alert: Open (Critical)",
  },
  4: {
    day: 4,
    phase: "Redistribution Intelligence",
    title: "Redistribution Proposal Drafted",
    narrative: "Deterministic engine identifies CHC Devgarh (18 km away). Devgarh holds 650 units and can safely spare 200 units while retaining 450 units (22.5d reserve, satisfying ≥21d rule). Proposal drafted.",
    metricsSummary: "Target Deficit: 200 units · Feasible Donor: CHC Devgarh · Post-transfer reserve: 22.5d (Safe)",
  },
  5: {
    day: 5,
    phase: "Approval & Dispatch",
    title: "CMHO Approval & Source Dispatch",
    narrative: "CMHO explicitly reviews and approves transfer proposal #TR-2026. Pharmacist confirms dispatch of 200 units. Stock marked In-Transit; donor stock debited in double-entry ledger.",
    metricsSummary: "Proposal: Approved & Dispatched · Devgarh Stock: 450 units · Status: In-Transit",
  },
  6: {
    day: 6,
    phase: "Reconciliation",
    title: "Physical Receipt & Alert Resolution",
    narrative: "PHC Rampur confirms physical arrival and verifies 200 units. Inventory replenished to 225 units (9+ days supply). Shortage alert automatically resolved in database.",
    metricsSummary: "Rampur Stock: 225 units (9.0d) · Status: NORMAL · Shortage Alert: RESOLVED",
  },
};

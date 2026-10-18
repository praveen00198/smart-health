# Smart Health --- Development Handoff & Master Specification

**Purpose:** This document is the single handoff brief for starting
Smart Health development in a new ChatGPT conversation and implementing
the project with Google Antigravity.

**Project status:** Research and product direction are sufficiently
complete to begin development. This document records the decisions made
so far, defines the hackathon demo scope, preserves the realistic Madhya
Pradesh operating model, and identifies what must remain configurable or
be verified before any real-world pilot.

**Important:** This is a development specification, not evidence that
the application has already been implemented or that government systems
are integrated. All demo data and government workflow examples must be
labelled accurately.

------------------------------------------------------------------------

## 1. Executive Summary

Smart Health is an AI-assisted public healthcare operations and medicine
supply-chain intelligence platform. Its first demonstration is a
synthetic district in Madhya Pradesh, India, containing approximately 10
fictional PHCs/CHCs and 15 medicines.

The system helps authorised healthcare administrators and facility
staff:

-   Monitor facility operations, medicine stock, beds, attendance,
    diagnostics, and reporting freshness.
-   Calculate days of stock remaining and identify potential medicine
    stock-outs.
-   Forecast demand using explainable numerical methods.
-   Detect near-expiry inventory and anomalous consumption.
-   Identify feasible redistribution opportunities between facilities.
-   Route recommendations and alerts to the appropriate human
    decision-maker.
-   Track acknowledgement, approval, dispatch, receipt, reconciliation,
    and resolution.
-   Use an AI agent to investigate risks and communicate
    recommendations, without letting the LLM invent numbers or
    independently approve/execute stock movements.

### Core principle

> **Deterministic code computes. The AI agent investigates, prioritises,
> reasons over tool outputs, and communicates. Authorised humans approve
> consequential actions.**

The application must remain useful if the LLM provider is unavailable.
Core calculations, the dashboard, alerts, simulated stock movements, and
templated notifications must not depend on a successful LLM call.

### Product positioning

Smart Health should complement existing government systems such as
e-Aushadhi and relevant state procurement processes. It should not claim
to replace those systems or possess access to their live data. During
the hackathon, use synthetic data and simulated integrations.

------------------------------------------------------------------------

## 2. Product Goals and Non-Goals

### Goals for the hackathon demo

1.  Provide a district-level overview of around 10 fictional healthcare
    facilities.
2.  Track stock for around 15 medicines, including critical medicines
    such as ORS and anti-snake venom.
3.  Compute days-of-stock remaining using a deterministic, tested
    engine.
4.  Generate explainable shortage alerts and demand forecasts.
5.  Recommend stock redistribution only when donor-reserve and
    recipient-need rules are satisfied.
6.  Monitor basic facility operational indicators: patient footfall, bed
    occupancy, doctor attendance, diagnostic test availability, and
    reporting freshness.
7.  Show a facility health score with visible components and stated
    reasons.
8.  Provide an agent workflow that investigates risk using bounded,
    logged tools.
9.  Provide role-specific workspaces and human approval for transfer
    proposals.
10. Run a repeatable simulation storyline that demonstrates end-to-end
    behaviour.
11. Label all generated facility and inventory data as
    synthetic/simulated.
12. Deploy an accessible demo early and verify the deployed build, not
    only localhost.

### Explicit non-goals for the hackathon

-   Real patient-level or personally identifiable health data.
-   Production authentication or claims of secure government identity
    integration.
-   Real integration with e-Aushadhi, HMIS, or any government API.
-   Actual procurement, purchase orders, payments, or physical stock
    transfer.
-   Offline-first functionality.
-   Training a custom ML model.
-   A full mobile application.
-   Autonomous AI approval of purchases or transfers.
-   Claims that simulated attendance, stock, or outbreaks are real.
-   A complex statewide rollout before a district workflow is validated.

------------------------------------------------------------------------

## 3. Research Findings and Confidence Boundaries

### 3.1 National baseline

India has national public-health standards, including the Indian Public
Health Standards (IPHS) 2022 guidance for PHCs, CHCs, sub-district
hospitals, and district hospitals. The national baseline informs
expected services and facility readiness, but individual state
structures, staffing, supply arrangements, and delegated powers vary.

Useful official starting point: - National Health Mission --- IPHS:
https://nhm.gov.in/index1.php?lang=1&level=1&lid=154&sublinkid=284

### 3.2 Madhya Pradesh-specific findings from the research discussed

-   Madhya Pradesh Public Health Services Corporation Limited (MPPHSC
    Ltd.) is identified in government review material as the state's
    central procurement agency.
-   The reviewed material describes rate-contract arrangements and
    institution-level purchasing against approved rates. Centralised
    rate contracting does **not** automatically mean all medicines are
    purchased and physically dispatched through one central warehouse.
-   Madhya Pradesh uses e-Aushadhi for procurement/supply-chain
    management and stock/distribution tracking. The reviewed government
    assessment reported its use down to sub-health-centre level.
-   The 2025 Common Review Mission material reported supply-chain
    concerns, including stock-outs of some essential medicines, long
    procurement-order lead times, and gaps in regular forecasting and
    physical stock verification. These are findings from an assessment,
    not claims that every facility has the same problem.
-   The discussed assessment reported different facility-level
    medicine-list counts (including 299 medicines for PHCs and 373 for
    CHCs). Treat these as source- and date-specific values, not
    permanent constants. Do not hard-code them as the current definitive
    catalogue.

Useful references: - NHM / Common Review Mission documents:
https://nhm.gov.in/New-Update-2024-26/CRM/17th-CRM-2025.pdf - e-Aushadhi
portal: https://mpaushadhi.mp.gov.in/IMCS/hissso/loginLogin.imcs -
Central Medical Services Society / e-Aushadhi overview:
https://www.cmss.gov.in/e-audshadhi/ - NHM Free Drugs Service
Initiative:
https://nhm.gov.in/nhm/index1.php?lang=1&level=2&lid=697&sublinkid=1318

### 3.3 What remains to verify before a real pilot

The hackathon can proceed with the operating model below. A real
deployment must verify, with the relevant MP authorities and current
orders:

-   The exact current procurement, rate-contract, and institution-level
    purchasing procedure.
-   Which entities store and dispatch each medicine category in the
    target district.
-   Current facility medicine lists and catalogue identifiers.
-   Current delegated financial and administrative powers.
-   Which officer can approve an inter-facility transfer, and under what
    circumstances.
-   Current data-sharing, security, privacy, integration, and audit
    requirements.
-   Whether approved integration APIs or authorised exports are
    available.
-   The authoritative source for stock, purchase orders, dispatches, and
    receipts.

Do not invent these rules in code. Make them configurable and document
assumptions.

------------------------------------------------------------------------

## 4. Recommended Organisation and Role Model

Smart Health should be **one integrated platform with role-specific
workspaces**, not several disconnected applications. Shared records must
remain consistent across workspaces.

### 4.1 Workspaces

#### A. State Health Authority --- future/optional in the demo

-   Statewide facility and district comparisons.
-   Aggregate medicine availability and supply-risk overview.
-   Procurement/supply performance monitoring.
-   State-level policy or systemic-risk escalation.
-   No assumed authority to approve every transaction; permissions
    depend on actual delegation.

#### B. Procurement Agency Workspace --- MPPHSC-oriented

-   Review aggregate demand and replenishment signals.
-   View simulated rate contracts, procurement status, supplier
    commitments, and shortages.
-   Identify gaps between demand and contracted/available supply.
-   Support future authorised integration with existing procurement
    processes.
-   In the demo, all purchase and contract information is synthetic.

#### C. District Health Administrator Workspace

Potential real-world titles include CMHO/CMO or equivalent, depending on
the state's administrative structure. Do not treat titles as universally
interchangeable. - District-wide KPIs and facility map. - Critical
alerts, facility health scores, and unresolved issues. - Assign,
acknowledge, review, and escalate operational problems. - Review
proposed transfers and monitor outcomes. - View reasons behind every
facility flag.

#### D. District/Regional Warehouse Workspace

-   Record receipt and inspection of stock.
-   Manage quantity, batch, expiry, and quality-hold status.
-   Prepare and record dispatches.
-   Reconcile dispatched versus received quantities.
-   Track discrepancies and stock availability.
-   This workspace is configurable because not every medicine follows an
    identical warehouse route.

#### E. PHC/CHC Medical Officer / Facility Manager Workspace

-   Facility operations summary.
-   Staff attendance and sanctioned staffing information.
-   Beds and diagnostic test availability.
-   Review operational risks and medicine shortage alerts.
-   Validate or submit relevant requests under local workflow.
-   Review assigned corrective actions.

#### F. Facility Inventory Officer / Pharmacist Workspace

-   Submit stock counts and consumption.
-   Manage batch/expiry information.
-   Raise replenishment requests.
-   Confirm receipt and reconcile quantities.
-   Report discrepancies and potential stock-outs.
-   The system should minimise data-entry burden and show the last
    update time.

#### G. Platform Administrator Workspace

-   Configure organisations, facilities, users, roles, medicine
    catalogues, and system settings.
-   Review technical audit events and application health.
-   Manage role assignments and state-specific configuration.
-   Platform administration does not automatically grant government
    procurement or transfer-approval authority.

### 4.2 Permissions design

Use role-based access control (RBAC) with organisation scope: -
State-scoped users can access authorised statewide information. -
District-scoped users can access their assigned district. -
Facility-scoped users can access their assigned facility. - Warehouse
users can access assigned warehouse records and authorised
transactions. - Procurement users can access relevant procurement and
supply records. - Platform admins manage technical configuration, but
sensitive business actions remain governed by explicit permissions.

One person may hold multiple roles in a small facility. Assign
permissions to users rather than assuming a separate employee exists for
every role.

------------------------------------------------------------------------

## 5. Approval Matrix --- Proposed Product Policy

**This matrix is a product-design recommendation, not an official MP
government delegation-of-powers document.** Before a real pilot, map
every approval to current state rules, financial limits, institutional
authority, and written procedures.

  ------------------------------------------------------------------------------------------------
  Action                   Initiates/recommends      Approval/authorisation   Executes/records
  ------------------------ ------------------------- ------------------------ --------------------
  Routine stock update     Facility stock custodian  Normally no separate     Stock custodian
                                                     approval for ordinary    
                                                     entry; exceptions may    
                                                     require review           

  Replenishment request    Inventory                 Facility Medical Officer Authorised
                           officer/pharmacist        or designated authority  supply/procurement
                                                     where required           process

  Purchase against rate    Authorised                Competent purchasing     Designated
  contract                 institution/procurement   authority under          purchasing
                           user                      applicable rules         institution

  Warehouse dispatch       Warehouse officer         Authorised               Warehouse team
                                                     issue/dispatch authority 

  Inter-facility transfer  Engine/agent or facility  Designated authority     Issuing and
                           user proposes             under applicable         receiving custodians
                                                     state/district rules     

  Receipt/reconciliation   Receiving stock custodian Reviewer approves        Receiving custodian
                                                     exceptions where         and authorised
                                                     required                 reviewer

  Emergency purchase       Facility/district         Competent authority      Authorised purchaser
                           authority where permitted under emergency          
                                                     procurement rules        

  Critical alert           Deterministic engine      No approval required to  System routes alert
                                                     issue alert              

  Underperformance flag    Deterministic score       District authority       Assigned official
                           engine                    reviews before           records follow-up
                                                     administrative action    

  Statewide policy change  Relevant state officials  Competent state          Designated agency
                                                     authority                
  ------------------------------------------------------------------------------------------------

### Non-negotiable business rules

1.  AI never approves or executes a purchase or transfer.
2.  An approved transfer is not a completed transfer.
3.  Stock changes are recorded as traceable transactions; do not
    silently overwrite history.
4.  Every sensitive action records actor, role, timestamp, reason,
    relevant previous/new values, and approval reference.
5.  Donor reserves, recipient need, expiry, batch, storage constraints,
    and transfer eligibility are checked before a proposal is made.
6.  Approval policy must be configurable by state, organisation,
    transaction type, and authority.
7.  A transfer cannot resolve an alert until the receiving quantity is
    confirmed and reconciled.
8.  The demo must make clear that workflow approvals are simulated and
    do not represent actual government authorisation.

------------------------------------------------------------------------

## 6. End-to-End Medicine Supply Workflow

### Block diagram

``` text
Facility stock/consumption data
             |
             v
Deterministic stock and demand engine
             |
             v
Risk detected? ---- No ----> Continue monitoring
      |
     Yes
      |
      v
Investigate available resolutions
      |
      +------------------------------+
      |                              |
      v                              v
Eligible donor surplus?        No eligible surplus
      |                              |
      v                              v
Transfer recommendation        Replenishment/procurement
      |                        escalation recommendation
      +---------------+--------------+
                      |
                      v
           Route to authorised human
                      |
               Approve / Reject /
             Request more information
                      |
            If approved and eligible
                      |
                      v
        Authorised dispatch / stock issue
                      |
                      v
       Receiving facility confirms receipt
                      |
                      v
        Reconcile stock and transaction
                      |
                      v
       Recompute risk and close/update alert
```

### Important distinction

The system must distinguish: - Rate contract / supplier agreement. -
Purchase request and purchase order. - Supplier or warehouse available
stock. - Dispatch/issue transaction. - In-transit quantity, if
tracked. - Physically received quantity. - Reconciled stock at the
destination facility.

A contracted price does not prove that medicine is available now. A
dispatch does not prove the recipient received the full quantity.

### Shortage resolution paths

**Path 1 --- Transfer:** Find a valid surplus donor, protect its minimum
reserve, check batch/expiry and distance, obtain approval, dispatch,
confirm receipt, and recalculate risk.

**Path 2 --- Replenishment:** If no feasible surplus exists, generate a
replenishment recommendation and route it through the configured
supply/procurement process.

------------------------------------------------------------------------

## 7. System Architecture

### 7.1 Recommended hackathon stack

-   **Frontend:** Next.js App Router, React, strict TypeScript, Tailwind
    CSS, shadcn/ui.
-   **Charts:** Recharts.
-   **Map:** Leaflet/react-leaflet, subject to compatibility with the
    chosen Next.js version and client-only rendering needs.
-   **Database/realtime:** Supabase PostgreSQL and Supabase Realtime.
-   **Backend:** Next.js route handlers and server-side TypeScript
    libraries. Do not introduce a separate Python service for the
    time-constrained demo.
-   **Validation:** A TypeScript schema-validation library if needed;
    justify dependencies.
-   **Testing:** Vitest for pure engine functions and API/business-rule
    tests.
-   **LLM:** One provider abstraction in `lib/llm.ts`, selected by
    environment configuration. Use a provider already available to the
    developer; do not waste time switching providers.
-   **Notifications:** In-app notifications first. Telegram or email is
    optional and must not block the demo.
-   **Deployment:** Vercel.
-   **Source control:** Git, with a commit after each verified phase.

Do not add libraries or services without a concrete reason. If an
integration is not configured, the app should provide a safe
simulated/fallback path rather than crash.

### 7.2 Architecture diagram

``` text
┌──────────────────────────────────────────────────────────────┐
│                       Smart Health UI                        │
│ Overview | Inventory & Forecast | Facility | Actions         │
│ Role-specific workspaces | Simulation controls               │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS / API
                               v
┌──────────────────────────────────────────────────────────────┐
│               Next.js Route Handlers / Services              │
│ Auth/RBAC boundary (demo role switch only)                    │
│ Input validation | API errors | business workflows            │
└───────────────┬──────────────────────────┬───────────────────┘
                │                          │
                v                          v
┌───────────────────────────┐  ┌───────────────────────────────┐
│ Deterministic TypeScript   │  │ Agent orchestration           │
│ Engine                     │  │ Tool calls, triage, messaging │
│ Stock / forecast / health  │  │ bounded calls, audit logs     │
│ Transfer / expiry / alerts │  │ fallback templates            │
└───────────────┬───────────┘  └───────────────┬───────────────┘
                │                              │
                └──────────────┬───────────────┘
                               v
┌──────────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL                          │
│ Facilities | Medicines | Stock | Consumption | Daily metrics  │
│ Alerts | Transfer proposals | Transactions | Agent logs       │
│ Notifications | State configuration                           │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               v
┌──────────────────────────────────────────────────────────────┐
│ Supabase Realtime → live UI updates                           │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 Security and reliability rules

-   Never expose the Supabase service-role key to the browser or prefix
    it with `NEXT_PUBLIC_`.
-   Browser access uses only the public/anon key where appropriate.
-   The demo has a role switcher but **no real authentication**. Label
    this clearly in README and UI.
-   Do not claim the role switcher provides security. Before production,
    implement real identity, server-side authorisation, organisation
    scoping, database policies, and audit controls.
-   Use server-side validation for all writes.
-   Do not store patient-identifiable information in the demo.
-   Keep secrets in local environment variables and Vercel environment
    settings, never in Git.
-   The core engine and demo scenario must work without the LLM.
-   Use database transactions or equivalent consistency controls for
    consequential stock movements.
-   Avoid duplicate alerts through stable dedupe keys and open-alert
    checks.
-   Provide loading, empty, error, and stale-data states in the UI.
-   Clearly distinguish live database data from simulated data.
-   Use synthetic/fictitious facility names and clearly labelled
    fictional locations/coordinates.

------------------------------------------------------------------------

## 8. Data Model

The schema below is a starting specification. Antigravity must validate
relationships, uniqueness, indexes, timestamp handling, and transaction
integrity before implementing migrations.

### 8.1 Core tables

#### `facilities`

-   `id`
-   `name`
-   `type`: `PHC` or `CHC` for the initial demo
-   `block`
-   `district_id` or equivalent organisation reference
-   `lat`, `lng` (fictional coordinates for the demo)
-   `catchment_population`
-   `sanctioned_doctors`
-   `sanctioned_beds`
-   optional state/facility configuration reference
-   `created_at`, `updated_at`

#### `medicines`

-   `id`
-   `name`
-   `category`
-   `criticality` from 1 to 3, where 3 means highest clinical
    criticality
-   `unit`
-   `lead_time_days`
-   optional catalogue code, storage requirements, state-list
    membership, active flag

#### `stock`

Represents current stock by facility, medicine, and preferably batch. -
`id` - `facility_id` - `medicine_id` - `batch_id` or batch fields -
`quantity` - `nearest_expiry` when using a simplified demo model -
`updated_at` - unique constraints must prevent duplicate current-stock
rows for the same facility/medicine/batch key.

For the demo, a simplified facility/medicine row can be used, but the
design should not prevent later batch-level inventory.

#### `consumption_daily`

-   `id`
-   `facility_id`
-   `medicine_id`
-   `date`
-   `quantity`
-   uniqueness on facility/medicine/date for the seeded aggregate
    record, unless the design intentionally supports multiple source
    records.

#### `facility_daily`

-   `id`
-   `facility_id`
-   `date`
-   `footfall`
-   `beds_occupied`
-   `doctors_present`
-   `last_reported_at`
-   unique facility/date where one daily aggregate is intended.

#### `test_availability`

-   `id`
-   `facility_id`
-   `test_name`
-   `available`
-   `updated_at`

#### `alerts`

-   `id`
-   `facility_id`
-   optional `medicine_id`
-   `type`: `STOCKOUT_RISK`, `EXPIRY`, `ATTENDANCE`, `BEDS`,
    `UNDERPERFORMING`, `NO_REPORT`
-   `severity`: `critical`, `warning`, `info`
-   `status`: `open`, `acknowledged`, `resolved`
-   `message`
-   `message_hi`
-   `dedupe_key`
-   `created_at`
-   `acknowledged_at`
-   `resolved_at`
-   `escalated`
-   reason/details payload for traceability

Use a reliable database constraint or transactional logic to prevent
duplicate open alerts with the same dedupe key. Do not rely only on a
client-side check.

#### `transfer_proposals`

-   `id`
-   `from_facility_id`
-   `to_facility_id`
-   `medicine_id`
-   `quantity`
-   `rationale`
-   `distance_km`
-   `status`: `proposed`, `approved`, `rejected`, `dispatched`,
    `received`, `cancelled`
-   `created_at`
-   optional approver, approval timestamp, rejection reason, dispatch
    reference, receipt reference.

The original brief used only proposed/approved/rejected. The expanded
statuses above are recommended to make the real transaction lifecycle
explicit. Keep approval and physical movement separate.

#### `stock_movements` (recommended addition)

-   `id`
-   `movement_type`: receipt, issue, transfer-out, transfer-in,
    adjustment, return, or another explicitly defined type
-   source/destination facility or warehouse
-   medicine and batch
-   quantity
-   linked transfer/procurement reference where applicable
-   status and timestamps
-   recorded-by user/role (simulated identity in demo)
-   reason and reconciliation details

This table is important because stock movement should be auditable
rather than implemented as an unexplained direct quantity overwrite.

#### `agent_logs`

-   `id`
-   `run_id`
-   `step`
-   `tool`
-   `input` JSON
-   `output` JSON
-   `created_at`

Avoid logging secrets or unnecessary personal data.

#### `notifications`

-   `id`
-   `role` or recipient reference, e.g. `inventory_head`,
    `district_admin`
-   `channel`: `in_app`, optionally `telegram`/`email`
-   `message`
-   `created_at`
-   `read`
-   optional linked alert/action and language.

#### `state_configuration` (recommended)

Store state-specific settings such as facility taxonomy, approval policy
references, medicine-list version, risk thresholds, and enabled
integration adapters. Do not encode MP-only assumptions throughout the
engine.

### 8.2 Synthetic seed data

Seed reproducibly using a deterministic random seed: - Approximately 10
fictional facilities across one fictional MP district. - Approximately
15 medicines. - 90 days of historical consumption for each
facility/medicine pair. - Weekday patterns and monsoon seasonality. - A
CHC with surplus ORS. - A PHC with ORS consumption that can become
critically high. - A near-expiry Amoxicillin batch. - A facility that
can demonstrate consecutive doctor-absence ticks. - Beds, staffing,
diagnostic availability, and reporting timestamps. - Data should be
plausible but must be labelled synthetic in the UI and README.

Seed and reset commands should be idempotent and documented. Never mix
simulated records with actual government data.

------------------------------------------------------------------------

## 9. Deterministic Engine Specification

Implement the engine as pure TypeScript functions wherever possible,
with unit tests based on hand-computed examples.

### 9.1 Weighted average daily consumption

`avgDailyConsumption(history)`

-   Use the last 14 days.
-   Weight recent days more heavily.
-   Define behaviour for missing days and zero consumption.
-   Avoid division by zero.
-   Return the calculation inputs or metadata needed to explain the
    result.

### 9.2 Days of stock remaining

`daysOfStock(quantity, avgDailyConsumption)`

-   `quantity / averageDailyConsumption` when average consumption is
    positive.
-   If average consumption is zero, return a deliberate representation
    (e.g. null/infinite/unbounded) and explain it in UI. Do not silently
    divide by zero.
-   Validate that quantities are non-negative and units are consistent.

### 9.3 Risk classification

Starting rules from the initial brief: - Critical if days of stock
`< lead_time_days`. - Warning if days of stock `< 2 × lead_time_days`. -
For criticality-3 medicines, use warning threshold
`< 3 × lead_time_days`. - Otherwise, risk is normal.

Make thresholds configurable and test boundary conditions. State clearly
that these are demo rules, not official clinical or government policy.

### 9.4 Fourteen-day forecast

`forecast14d(history)`

-   Baseline: weighted average or defined average.
-   Include weekday factors derived from the 90-day history.
-   Add a damped linear trend if the implementation can be tested
    reliably.
-   Confidence band: `± 1.28 × residual standard deviation` for an
    approximate 80% band, if the assumptions and calculation are
    implemented correctly.
-   Output chart-ready daily values and forecast metadata.
-   Prevent negative predicted consumption.
-   Explain that this is a simple demonstrative forecast, not a
    validated epidemiological model.

Do not use the LLM to calculate forecasts.

### 9.5 Redistribution recommendation

`findDonors(recipient, medicine)`

Candidate donor conditions from the initial brief: -
`quantity - avgDailyConsumption × 30 > 0` - Donor retains at least 21
days of stock after the proposed transfer. - Recipient target is 30 days
of cover. - Proposed quantity is bounded by donor surplus and
recipient's target shortfall. - Rank by distance using Haversine
distance, with expiry-first as an additional prioritisation criterion. -
Return the top three candidates, including a rationale object containing
the exact numeric inputs and calculated results.

Further safeguards: - Never transfer expired, quality-held, or otherwise
ineligible stock. - Respect medicine/batch compatibility and storage
constraints. - The donor's minimum reserve is a demo rule and must be
configurable. - The engine recommends only. Human approval and
dispatch/receipt workflow remain separate.

### 9.6 Expiry risk

-   Flag stock whose expiry date is earlier than the estimated time
    needed to consume it, using the initial demo heuristic:
    `nearest_expiry < today + daysOfStock`.
-   Clearly define date boundaries and timezone behaviour.
-   Where useful, suggest an eligible facility with higher consumption.
-   Do not recommend moving stock that will expire before it can
    reasonably be used.

### 9.7 Facility health score

Score from 0 to 100 with visible components: - Stock availability: 35% -
Doctor attendance: 25% - Bed readiness: 15% - Diagnostic test
availability: 15% - Reporting freshness: 10%

Initial component concepts: - Stock availability: share of criticality ≥
2 medicines above warning thresholds. - Attendance: seven-day doctor
presence relative to sanctioned staffing. - Bed readiness:
available/readiness measure relative to configured capacity. - Test
availability: share of required configured tests available. - Reporting
freshness: based on age of latest report.

Flag `UNDERPERFORMING` if score `< 60` or any component `< 40`, with
explicit reason strings. These are demo thresholds, not official
performance policy.

Normalise footfall using catchment population (e.g. footfall per 1,000
catchment population) so small facilities are not automatically
penalised. Do not equate low footfall by itself with poor performance.

### 9.8 Alert lifecycle

-   Deduplicate open alerts by stable `dedupe_key`.
-   Do not generate a new alert every simulation tick when an equivalent
    open alert exists.
-   Original brief proposes a 24 simulated-hour cooldown after
    resolution.
-   Critical alert unacknowledged for more than three simulation ticks
    becomes escalated and generates a district-admin notification.
-   Acknowledge and resolve actions must persist to the database.
-   Define whether a resolved alert can reopen if the risk recurs after
    cooldown.
-   Keep audit history of alert changes.

------------------------------------------------------------------------

## 10. Agentic AI Specification

### 10.1 Agent responsibilities

The agent should: 1. Triage multiple alerts by severity and clinical
criticality. 2. Investigate stock-out risk by checking consumption
trend, stock, nearby surplus, distance, and expiry. 3. Draft a concise
message in English or Hindi using exact tool outputs. 4. Create a
transfer proposal only through a validated tool that applies engine
rules. 5. Notify the correct configured role. 6. Follow up on
unacknowledged alerts and escalate according to deterministic rules. 7.
Answer natural-language administrator questions by calling approved
read-only tools, not by generating free-form SQL.

### 10.2 Tools

-   `get_district_risks()`
-   `get_facility_detail(facility_id)`
-   `get_stock_trend(facility_id, medicine_id)`
-   `find_donors(recipient_id, medicine_id)`
-   `create_transfer_proposal(...)`
-   `create_alert(...)` where needed and validated
-   `send_notification(role, message, language)`
-   `flag_facility(facility_id, reasons)`

Tool functions should validate input, enforce role/permission rules, use
deterministic service functions, and return structured JSON. Do not let
the LLM bypass business rules by writing directly to tables.

### 10.3 Hard guardrails

-   Every figure in agent messages must be returned by a tool; validate
    against structured tool outputs.
-   LLM does not compute numerical stock, forecast, or health-score
    values.
-   The agent may recommend transfers but may not approve or execute
    physical movements.
-   Human approval is required for consequential actions.
-   Log every tool call, input, output, and action in `agent_logs`,
    excluding secrets.
-   Maximum 8 tool calls per run.
-   Maximum one agent run per 20 seconds, or a stricter server-side
    limit if necessary.
-   Deduplicate notifications and apply a cooldown to prevent alert
    fatigue.
-   If the LLM fails or returns invalid output, create a template
    notification based on deterministic results and keep the app
    running.
-   Use bounded structured output; reject ungrounded figures and invalid
    IDs.
-   Never run arbitrary LLM-generated SQL.
-   Limit agent execution time and return clear progress/failure state
    to the UI.

### 10.4 Event triggers

-   Event-triggered: when stock/consumption is written, deterministic
    engine evaluates risk. Invoke the agent only when a new meaningful
    risk is found.
-   Scheduled sweep: periodically inspect district-level risks and
    facilities that have stopped reporting.
-   For the hackathon, a manual "Run agent" button is an acceptable
    fallback. Do not make a database trigger call an LLM directly
    without a secure, bounded server-side orchestration path.

------------------------------------------------------------------------

## 11. UI Screens and UX Requirements

### Screen 1 --- District Overview

-   KPI cards: critical alerts, facilities at risk, average health
    score, beds free.
-   Facility map with risk/status colours.
-   Live alert feed.
-   Simulated date and clear "Synthetic demo data" indicator.
-   Filters for facility type, block, status, and medicine where useful.
-   Realtime updates without page refresh.

### Screen 2 --- Inventory & Forecast

-   Facility-by-medicine heatmap/table coloured by days of stock.
-   Search and filters.
-   Selecting a cell opens a detail view/chart.
-   Forecast chart with historical data, forecast, confidence band,
    current stock, and projected stock-out date where computable.
-   Show stock last-updated time and data provenance.
-   Distinguish zero stock from missing/stale data.

### Screen 3 --- Facility Detail

-   Facility identity, type, catchment and reporting status.
-   Health score and visible weighted components.
-   Stock list, days of stock, risk, and expiry.
-   Beds occupied/free, attendance, tests.
-   Active alerts and assigned follow-up.
-   Recent stock movements and data freshness.

### Screen 4 --- Actions & Agent Audit

-   Alerts with acknowledge/resolve actions.
-   Transfer proposals with rationale and approve/reject actions.
-   Clear state transitions: proposed → approved/rejected → dispatched →
    received/reconciled.
-   Notification inbox.
-   Agent audit timeline: tool, inputs, outputs, and action.
-   "Ask the agent" box for constrained data-grounded queries.
-   Human-approval warning where relevant.

### Shared UX

-   Professional, calm healthcare design with strong hierarchy and risk
    colours; avoid overly decorative or distracting visuals.
-   Responsive desktop-first layout.
-   English/Hindi toggle via a simple dictionary for the demo, if time
    permits.
-   Role switcher in header, explicitly labelled "Demo role switcher ---
    not authentication."
-   Simulation controls: Start/Pause, speed if feasible, "Run monsoon
    outbreak scenario," Reset data.
-   Use meaningful loading, empty, stale-data, and error states.
-   No lorem ipsum, fake buttons, or unimplemented actions presented as
    working.
-   Error validation appears near the relevant input.
-   The footer and README must say that the data is synthetic and the
    role switcher is not authentication.

------------------------------------------------------------------------

## 12. Simulation and Demo Storyline

### Simulation clock

-   One simulation tick represents one simulated day.
-   When simulation is started from the UI, tick approximately every
    four seconds.
-   Each tick appends consumption and facility-daily records for the
    simulated date and updates stock through explicit
    movement/consumption logic.
-   Display the simulated date prominently.
-   Start/Pause and Reset must be reliable.
-   Prevent duplicate concurrent tick requests.
-   Reset restores the exact seeded baseline.

### Deterministic scenario

1.  Begin with a healthy baseline district.
2.  Trigger ORS consumption at PHC Rampur at approximately four times
    its baseline.
3.  Engine predicts a critical stock-out risk within the scripted period
    (target: about six simulated days, if seeded data supports it).
4.  Agent checks donors and identifies surplus ORS at CHC Devgarh.
5.  Agent creates a transfer proposal and notifies the inventory head.
6.  A human demo user approves the proposal.
7.  Dispatch and receipt are recorded; only after confirmed receipt
    should the risk be recalculated and potentially cleared.
8.  Introduce doctor absence for three consecutive ticks at PHC Khejra;
    generate attendance and underperformance flags with explicit
    reasons.
9.  Trigger an Amoxicillin near-expiry alert and an eligible
    redistribution proposal.
10. Leave a critical alert unacknowledged long enough to demonstrate
    escalation to the district administrator.

The scenario should complete in under 90 seconds after Reset if
feasible. It must be repeatable. Do not rely on uncontrolled random
behaviour for the key storyline.

### Demo reliability

-   Core dashboard works without an LLM key.
-   Invalid/unavailable LLM key results in template messages, not a
    crash.
-   Keep a recorded backup demo video.
-   Test the deployed version.
-   Make all simulated actions visibly synthetic.

------------------------------------------------------------------------

## 13. API Surface (Initial Proposal)

The precise endpoint naming can be refined during implementation, but
keep the surface small and consistent.

### Health and data

-   `GET /api/health` --- database connectivity and counts for core
    tables.
-   `GET /api/facilities`
-   `GET /api/facilities/:id`
-   `GET /api/inventory`
-   `GET /api/alerts`
-   `GET /api/notifications`
-   `GET /api/transfers`

### Engine

-   `GET /api/engine/risks`
-   `GET /api/engine/forecast?facilityId=...&medicineId=...`
-   `POST /api/engine/recompute` if explicit recomputation is needed.

### Workflows

-   `POST /api/alerts/:id/acknowledge`
-   `POST /api/alerts/:id/resolve`
-   `POST /api/transfers/:id/approve`
-   `POST /api/transfers/:id/reject`
-   `POST /api/transfers/:id/dispatch`
-   `POST /api/transfers/:id/receive`
-   `POST /api/stock/submit`
-   `POST /api/replenishment-requests`

### Agent and simulation

-   `POST /api/agent/run`
-   `POST /api/simulate/tick`
-   `POST /api/simulate/scenario`
-   `POST /api/simulate/reset`
-   `POST /api/simulate/start` / `pause` only if server-side state is
    needed.

For every mutating endpoint: - Validate payloads on the server. - Return
consistent error shapes and meaningful status codes. - Prevent duplicate
or invalid transitions. - Record audit events. - Use a database
transaction where multiple related records must change together.

------------------------------------------------------------------------

## 14. Repository Structure Proposal

Antigravity may adapt the exact layout to the generated Next.js project,
but responsibilities should remain clear.

``` text
smart-health/
├── app/
│   ├── (dashboard)/
│   │   ├── overview/
│   │   ├── inventory/
│   │   ├── facilities/[id]/
│   │   └── actions/
│   ├── api/
│   │   ├── health/route.ts
│   │   ├── facilities/
│   │   ├── inventory/
│   │   ├── alerts/
│   │   ├── transfers/
│   │   ├── agent/run/route.ts
│   │   └── simulate/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   ├── overview/
│   ├── inventory/
│   ├── facilities/
│   ├── alerts/
│   ├── transfers/
│   ├── agent/
│   └── simulation/
├── lib/
│   ├── supabase/
│   ├── validation/
│   ├── repositories/
│   ├── services/
│   ├── engine/
│   ├── agent/
│   ├── simulation/
│   ├── permissions/
│   └── utils/
├── supabase/
│   ├── migrations/
│   └── seed/
├── tests/
│   ├── engine/
│   ├── workflows/
│   └── api/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── OPERATING_MODEL.md
│   └── DEMO_SCRIPT.md
├── SPEC.md
├── README.md
├── .env.example
├── package.json
└── ...
```

Do not generate every possible module in advance if it slows the working
demo. Keep the architecture clean but implement only the active phase.

------------------------------------------------------------------------

## 15. Environment and Setup

Before development: 1. Create/confirm the project directory and Git
repository. 2. Create a Supabase project and save its URL, public/anon
key, and service-role key securely. 3. Select one LLM provider only if a
usable key is already available; otherwise implement and test template
fallback first. 4. Connect the repository to Vercel and deploy the
simplest working skeleton early. 5. Create `.env.local` locally and
`.env.example` with variable names only. 6. Never commit secrets.

Suggested environment names: - `NEXT_PUBLIC_SUPABASE_URL` -
`NEXT_PUBLIC_SUPABASE_ANON_KEY` - `SUPABASE_SERVICE_ROLE_KEY` (server
only, never public) - `LLM_PROVIDER` - Provider-specific server-only API
key - Optional `TELEGRAM_BOT_TOKEN` and chat configuration if used

Use the exact environment names required by the chosen SDK/provider.
Validate required configuration at startup or route entry and return
helpful errors without exposing secret values.

------------------------------------------------------------------------

## 16. Phased Development and Acceptance Criteria

### Phase 0 --- Repository and setup

-   Confirm Node/npm versions and project structure.
-   Initialise Git.
-   Scaffold Next.js App Router with strict TypeScript.
-   Install only required dependencies.
-   Configure lint, build, test scripts and `.env.example`.
-   Deploy a basic page to Vercel as early as possible.

**Acceptance:** clean install, dev server starts, build succeeds,
deployed page opens.

### Phase 1 --- Database, schema, seed

-   Create migrations for core tables and indexes.
-   Enable Supabase Realtime for relevant tables.
-   Create deterministic seed/reset scripts.
-   Seed 10 facilities, 15 medicines, and 90 days of history.
-   Include ORS surplus, ORS risk scenario, near-expiry Amoxicillin,
    attendance storyline, beds/tests.
-   Add `GET /api/health` with counts.

**Acceptance:** - Migration and seed run successfully. - Reset returns
the same baseline. - Every expected facility/medicine history exists. -
No secrets are exposed. - Table relationships and uniqueness constraints
work.

### Phase 2 --- Deterministic engine

Implement and test: - Weighted average consumption. - Days-of-stock. -
Risk classification. - 14-day forecast. - Redistribution. - Expiry
checks. - Facility health score. - Alert deduplication. - Escalation. -
Tests with hand-computed values and edge cases.

**Acceptance:** - All tests pass. - Seeded near-stockout and near-expiry
conditions are detected. - ORS donor recommendation is feasible and
numerically explainable. - Zero consumption, missing history, and
boundary thresholds are handled explicitly.

### Phase 3 --- Dashboard and realtime

-   Build the four screens.
-   Connect to real seeded Supabase data, not hard-coded mock arrays.
-   Implement role switcher, risk indicators, chart, facility detail and
    action lists.
-   Subscribe to relevant Realtime tables.
-   Add simulation control panel UI.
-   Deploy to Vercel.

**Acceptance:** - Editing an authorised stock row in the database
updates relevant UI without refresh. - No browser console errors. -
Build passes. - Deployed application works with production environment
variables. - Role switcher is clearly marked as demo-only.

### Phase 4 --- Workflows and agent

-   Implement alert acknowledgement/resolution.
-   Implement transfer proposal approval/rejection.
-   Add explicit dispatch and receipt confirmation.
-   Add stock movement/audit history.
-   Implement `lib/llm.ts` and bounded tools.
-   Add notification fallback and agent audit log.
-   Add optional messaging integration only if time allows.

**Acceptance:** - `POST /api/agent/run` produces grounded messages and
proposals for seeded risks. - Invalid LLM key does not crash the
application. - Human approval is required. - Dispatch does not
automatically mean receipt. - Every tool call/action is logged. -
Duplicate alerts and notifications are controlled.

### Phase 5 --- Simulation and storyline

-   Implement tick endpoint and client Start/Pause.
-   Add deterministic scenario and Reset.
-   Apply consumption and facility metrics for each simulated day.
-   Recompute risk and trigger agent/fallback workflow.
-   Escalate unacknowledged critical alerts.

**Acceptance:** - Scenario runs repeatably after Reset. - Full story can
be demonstrated in under 90 seconds if the chosen timing supports it. -
Dashboard updates live. - No duplicate ticks or repeated alerts from one
risk. - Core scenario works without LLM availability.

### Phase 6 --- Demo polish and submission

-   Fix critical bugs only.
-   Verify deployment, data labels, UI states and responsive layout.
-   Test all key actions manually.
-   Record backup demo video.
-   Prepare honest project summary and limitations.

**Acceptance:** no broken core flow, no unsupported claims, no secret
leaks, and a repeatable demonstration.

### Feature cut order under time pressure

Cut in this order if the core is behind schedule: 1. Hindi toggle. 2.
Natural-language query box. 3. Telegram/email integration. 4. Forecast
confidence band. 5. Optional extra charts and nonessential polish.

Do **not** cut the deterministic engine, seed/reset reliability, ORS
storyline, transfer approval boundary, fallback behaviour, or clear
synthetic-data labels.

------------------------------------------------------------------------

## 17. Testing Checklist

### Engine

-   Zero consumption.
-   No history / partial history.
-   Negative or invalid quantity rejected.
-   Exact lead-time boundary.
-   Criticality-3 warning threshold.
-   Donor cannot go below reserve.
-   Recipient already has target coverage.
-   Expired/quality-held batch excluded.
-   Expiry date boundary.
-   Health-score component and total calculation.
-   Small catchment normalisation.
-   Duplicate open alert prevention.
-   Escalation exactly after configured tick count.

### Workflow

-   Approve/reject only from proposed state.
-   Cannot dispatch rejected proposal.
-   Cannot mark received before dispatch.
-   Partial receipt/discrepancy handled deliberately.
-   Alert closes only after risk recalculation/appropriate resolution.
-   Stock movement and current stock stay consistent.
-   Concurrent actions do not double-issue stock.
-   Every action has an audit record.

### Agent

-   Provider unavailable.
-   Invalid API key.
-   Invalid structured response.
-   Tool error.
-   Tool-call cap reached.
-   Run rate limit reached.
-   Duplicate notification.
-   Figures match tool outputs.
-   LLM cannot approve or execute transfers.

### UI/deployment

-   No console errors.
-   Realtime subscription cleanup works.
-   Empty/loading/error states render.
-   Stale data is visible.
-   Simulation Start/Pause/Reset works.
-   Role switcher is visibly demo-only.
-   Deployed environment variables are correct.
-   Service-role key never appears in client bundle or browser network
    payloads.
-   Synthetic data label is visible.

------------------------------------------------------------------------

## 18. Five-Minute Demo Script

1.  **Introduce the problem (30 seconds):** A district may have medicine
    shortages even when stock exists elsewhere; fragmented data and late
    reporting make coordination difficult.
2.  **Show baseline district (45 seconds):** Map, KPIs, inventory
    heatmap, health scores, and synthetic-data label.
3.  **Trigger monsoon ORS scenario (60 seconds):** ORS consumption rises
    at PHC Rampur; the engine explains days of stock and risk.
4.  **Show agent investigation (60 seconds):** The agent checks CHC
    Devgarh surplus, presents exact tool-grounded figures, and proposes
    a transfer.
5.  **Show human decision and transaction (45 seconds):** Approve the
    proposal, record dispatch, confirm receipt, and show recalculated
    risk.
6.  **Show other alerts (45 seconds):** Doctor absence, near-expiry
    Amoxicillin, and escalation of an unacknowledged critical alert.
7.  **Close with architecture and honesty (15 seconds):** Deterministic
    computation, auditable AI assistance, human approvals, synthetic
    demo data, and a future path to authorised MP system integration.

Keep a backup video. Do not imply the demo uses real PHC data or
performs real government stock transfers.

------------------------------------------------------------------------

## 19. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Staff data is late or incorrect     Show freshness, missing reports,
                                      validation and anomaly flags;
                                      future capture should be
                                      low-burden/offline tolerant

  Insufficient history for ML         Use explainable baseline/seasonal
                                      methods; pool data only where
                                      justified; avoid claiming validated
                                      ML

  Transfer is not administratively    Make transfer eligibility and
  feasible                            approval policy configurable; human
                                      approval; verify state rules

  AI hallucinates figures             Tool-grounded outputs, schema
                                      validation, bounded tools, audit
                                      log

  Alert fatigue                       Severity ranking, deduplication,
                                      cooldowns and escalation rules

  Low footfall is misinterpreted      Normalise by catchment and show
                                      reasons; never treat low footfall
                                      alone as failure

  Integration assumptions are wrong   Use adapters and synthetic
                                      fixtures; verify authorised
                                      interfaces before pilot

  LLM outage during demo              Deterministic engine and template
                                      notification fallback; backup video

  Realtime does not work              Verify database publication, access
                                      policy and a real table-edit test

  Service key leaks                   Server-only environment variable,
                                      code review, build inspection

  Duplicate stock movements           Transactional server-side
                                      validation, movement ledger,
                                      idempotency where practical

  Scope creep                         Phase boundaries, acceptance
                                      checks, feature freeze, commit
                                      after each phase
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 20. Rules for Google Antigravity

Use this document as the source of truth. Do not paste all phases into
one giant implementation request.

### Required working style

-   Read this document fully before coding.
-   Inspect the existing repository before modifying or deleting
    anything.
-   Work on only the current phase.
-   Do not refactor earlier phases unless a test fails or a necessary
    dependency is documented.
-   Do not delete the project or overwrite existing user work.
-   Before destructive operations, explain the plan and preserve
    recoverable state.
-   Implement the smallest working solution that satisfies acceptance
    criteria.
-   Do not leave buttons or routes that appear functional but do
    nothing.
-   Use seeded database data rather than hard-coded frontend mock
    arrays.
-   Do not invent external integration credentials, endpoints, or
    government APIs.
-   Do not claim tests, deployment, or integrations succeeded unless
    actually run and verified.
-   Run relevant tests and `npm run build` after each phase.
-   Fix regressions introduced by the current phase before proceeding.
-   Report what works, what failed, what remains, and exact commands
    run.
-   Stop after each phase and wait for explicit approval to continue.
-   Commit to Git after each accepted phase.

### Suggested first prompt in the new development chat

> Read `SMART_HEALTH_DEVELOPMENT_HANDOFF.md` fully. We are starting
> implementation, not doing broad product research again. First inspect
> the repository and available environment without deleting or
> overwriting files. Summarise the current state, identify blockers, and
> propose the smallest Phase 0 plan. Do not start Phase 1 until I
> approve Phase 0. Preserve the technology stack and non-negotiable
> rules in the handoff. Never claim a command, test, deployment, or
> integration succeeded unless you actually ran and verified it.

After Phase 0 is accepted, provide one separate prompt for each phase,
including the acceptance criteria from this document.

------------------------------------------------------------------------

## 21. Decisions Recorded

-   Product name: **Smart Health**.
-   Initial geography: Madhya Pradesh; future expansion across India.
-   Initial delivery: hackathon demonstration using synthetic data.
-   Future goal: realistic, configurable architecture suitable for a
    validated pilot.
-   Frontend/backend implementation: Next.js App Router and TypeScript,
    with Next.js route handlers and server-side libraries for the demo.
-   Database/realtime: Supabase PostgreSQL and Realtime.
-   Numerical engine: deterministic TypeScript functions with tests.
-   AI role: investigate, triage, communicate, and create proposals
    through validated tools; no invented figures or autonomous
    approvals.
-   Existing government systems: complement e-Aushadhi and relevant
    procurement processes; do not claim replacement or integration
    without evidence.
-   User workspaces: state oversight (future), procurement, district
    administration, warehouse, facility operations, facility inventory,
    and platform administration.
-   Transfer lifecycle: recommendation → human decision → dispatch →
    receipt → reconciliation.
-   Core demo: ORS monsoon shortage, feasible surplus donor, transfer
    approval, doctor absence, near-expiry Amoxicillin, escalation.
-   Synthetic data and demo-only role switching must be clearly
    labelled.
-   Development proceeds phase by phase with tests, build verification,
    Git commits, and explicit acceptance.

------------------------------------------------------------------------

## 22. Are We Ready to Develop?

**Yes. The research is sufficient to begin the hackathon
implementation.** We should not continue expanding the research scope
unless a specific development blocker or state-specific question
emerges.

The correct next step is to: 1. Save this file in the repository root as
`SMART_HEALTH_DEVELOPMENT_HANDOFF.md`. 2. Open a new ChatGPT
conversation and attach or paste this document. 3. Have Antigravity
inspect the repository and complete Phase 0. 4. Start Phase 1 only after
setup is verified.

The real-world operating model is deliberately designed to be
configurable. That allows us to build a credible demo now without
pretending that every Madhya Pradesh approval, warehouse route, or
government integration has already been verified.

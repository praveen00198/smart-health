import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// 1. Facilities
export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'PHC' | 'CHC' | 'DH' | 'WAREHOUSE'
  block: text("block").notNull(),
  district: text("district").notNull().default("Sehore"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  catchmentPopulation: integer("catchment_population").notNull(),
  sanctionedDoctors: integer("sanctioned_doctors").notNull().default(1),
  sanctionedBeds: integer("sanctioned_beds").notNull().default(4),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 2. Medicines Catalogue
export const medicines = pgTable("medicines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  criticality: integer("criticality").notNull(), // 1 to 3
  unit: text("unit").notNull(),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3. Current Stock
export const stock = pgTable("stock", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  medicineId: uuid("medicine_id")
    .notNull()
    .references(() => medicines.id, { onDelete: "cascade" }),
  batchNumber: text("batch_number").notNull(),
  quantity: integer("quantity").notNull(),
  expiryDate: date("expiry_date").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 4. Daily Consumption History
export const consumptionDaily = pgTable("consumption_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  medicineId: uuid("medicine_id")
    .notNull()
    .references(() => medicines.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  quantity: integer("quantity").notNull(),
});

// 5. Daily Facility Operational Telemetry
export const facilityDaily = pgTable("facility_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  footfall: integer("footfall").notNull(),
  bedsOccupied: integer("beds_occupied").notNull(),
  doctorsPresent: integer("doctors_present").notNull(),
  lastReportedAt: timestamp("last_reported_at", { withTimezone: true }).notNull().defaultNow(),
});

// 6. Diagnostic Test Availability
export const testAvailability = pgTable("test_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  testName: text("test_name").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 7. Operational Alerts
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    medicineId: uuid("medicine_id").references(() => medicines.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    severity: text("severity").notNull(), // 'critical' | 'warning' | 'info'
    status: text("status").notNull().default("open"), // 'open' | 'acknowledged' | 'resolved'
    message: text("message").notNull(),
    messageHi: text("message_hi"),
    dedupeKey: text("dedupe_key").notNull(),
    details: jsonb("details").notNull().default({}),
    escalated: boolean("escalated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_open_alerts_dedupe")
      .on(table.dedupeKey)
      .where(sql`${table.status} = 'open'`),
  ]
);

// 8. Inter-Facility Transfer Proposals
export const transferProposals = pgTable("transfer_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromFacilityId: uuid("from_facility_id")
    .notNull()
    .references(() => facilities.id),
  toFacilityId: uuid("to_facility_id")
    .notNull()
    .references(() => facilities.id),
  medicineId: uuid("medicine_id")
    .notNull()
    .references(() => medicines.id),
  batchNumber: text("batch_number").notNull(),
  quantity: integer("quantity").notNull(),
  rationale: text("rationale").notNull(),
  distanceKm: numeric("distance_km", { precision: 6, scale: 2 }).notNull(),
  status: text("status").notNull().default("proposed"), // 'proposed' | 'approved' | 'rejected' | 'dispatched' | 'received' | 'cancelled'
  approvedBy: text("approved_by"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 9. Double-Entry Stock Ledger
export const stockTransactions = pgTable("stock_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id),
  medicineId: uuid("medicine_id")
    .notNull()
    .references(() => medicines.id),
  batchNumber: text("batch_number").notNull(),
  quantityDelta: integer("quantity_delta").notNull(),
  transactionType: text("transaction_type").notNull(), // 'RECEIPT' | 'DISPENSATION' | 'DISPATCH' | 'ARRIVAL' | 'ADJUSTMENT_LOSS' | 'ADJUSTMENT_EXPIRY'
  referenceId: uuid("reference_id"),
  recordedBy: text("recorded_by").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 10. Agent Investigation Logs
export const agentLogs = pgTable("agent_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull(),
  step: integer("step").notNull(),
  tool: text("tool").notNull(),
  input: jsonb("input").notNull(),
  output: jsonb("output").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 11. Notifications Inbox
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role").notNull(),
  channel: text("channel").notNull().default("in_app"),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  alertId: uuid("alert_id").references(() => alerts.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Type definitions for inference
export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = typeof facilities.$inferInsert;

export type Medicine = typeof medicines.$inferSelect;
export type InsertMedicine = typeof medicines.$inferInsert;

export type Stock = typeof stock.$inferSelect;
export type InsertStock = typeof stock.$inferInsert;

export type ConsumptionDaily = typeof consumptionDaily.$inferSelect;
export type InsertConsumptionDaily = typeof consumptionDaily.$inferInsert;

export type FacilityDaily = typeof facilityDaily.$inferSelect;
export type InsertFacilityDaily = typeof facilityDaily.$inferInsert;

export type TestAvailability = typeof testAvailability.$inferSelect;
export type InsertTestAvailability = typeof testAvailability.$inferInsert;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

export type TransferProposal = typeof transferProposals.$inferSelect;
export type InsertTransferProposal = typeof transferProposals.$inferInsert;

export type StockTransaction = typeof stockTransactions.$inferSelect;
export type InsertStockTransaction = typeof stockTransactions.$inferInsert;

export type AgentLog = typeof agentLogs.$inferSelect;
export type InsertAgentLog = typeof agentLogs.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

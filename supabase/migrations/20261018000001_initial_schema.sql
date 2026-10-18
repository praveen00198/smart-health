-- ============================================================================
-- Smart Health — Initial PostgreSQL Schema Migration
-- Migration: 20261018000001_initial_schema.sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Facilities
CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PHC', 'CHC', 'DH', 'WAREHOUSE')),
    block TEXT NOT NULL,
    district TEXT NOT NULL DEFAULT 'Sehore',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    catchment_population INTEGER NOT NULL CHECK (catchment_population > 0),
    sanctioned_doctors INTEGER NOT NULL DEFAULT 1,
    sanctioned_beds INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Medicines Catalogue
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    criticality INTEGER NOT NULL CHECK (criticality BETWEEN 1 AND 3),
    unit TEXT NOT NULL,
    lead_time_days INTEGER NOT NULL DEFAULT 7,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Current Stock
CREATE TABLE IF NOT EXISTS stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    expiry_date DATE NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_facility_medicine_batch UNIQUE (facility_id, medicine_id, batch_number)
);

-- 4. Daily Consumption History
CREATE TABLE IF NOT EXISTS consumption_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    CONSTRAINT uq_facility_medicine_date UNIQUE (facility_id, medicine_id, date)
);

-- 5. Daily Facility Operational Telemetry
CREATE TABLE IF NOT EXISTS facility_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    footfall INTEGER NOT NULL CHECK (footfall >= 0),
    beds_occupied INTEGER NOT NULL CHECK (beds_occupied >= 0),
    doctors_present INTEGER NOT NULL CHECK (doctors_present >= 0),
    last_reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_facility_date UNIQUE (facility_id, date)
);

-- 6. Diagnostic Test Availability
CREATE TABLE IF NOT EXISTS test_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_facility_test UNIQUE (facility_id, test_name)
);

-- 7. Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    message TEXT NOT NULL,
    message_hi TEXT,
    dedupe_key TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    escalated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

-- 8. Inter-Facility Transfer Proposals
CREATE TABLE IF NOT EXISTS transfer_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_facility_id UUID NOT NULL REFERENCES facilities(id),
    to_facility_id UUID NOT NULL REFERENCES facilities(id),
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    batch_number TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    rationale TEXT NOT NULL,
    distance_km NUMERIC(6,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'dispatched', 'received', 'cancelled')),
    approved_by TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Double-Entry Stock Ledger
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    batch_number TEXT NOT NULL,
    quantity_delta INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('RECEIPT', 'DISPENSATION', 'DISPATCH', 'ARRIVAL', 'ADJUSTMENT_LOSS', 'ADJUSTMENT_EXPIRY')),
    reference_id UUID,
    recorded_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Agent Investigation Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL,
    step INTEGER NOT NULL,
    tool TEXT NOT NULL,
    input JSONB NOT NULL,
    output JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Notifications Inbox
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'in_app',
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes for High-Performance Queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stock_lookup ON stock (facility_id, medicine_id);
CREATE INDEX IF NOT EXISTS idx_consumption_lookup ON consumption_daily (facility_id, medicine_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_facility_daily_lookup ON facility_daily (facility_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_lookup ON alerts (facility_id, status);
CREATE INDEX IF NOT EXISTS idx_transfer_proposals_status ON transfer_proposals (status);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_lookup ON stock_transactions (facility_id, medicine_id, created_at DESC);

-- Unique partial index for open alert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_open_alerts_dedupe ON alerts (dedupe_key) WHERE status = 'open';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Public read access policies for dashboard and realtime visibility
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read facilities" ON facilities;
    CREATE POLICY "Public read facilities" ON facilities FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read medicines" ON medicines;
    CREATE POLICY "Public read medicines" ON medicines FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read stock" ON stock;
    CREATE POLICY "Public read stock" ON stock FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read consumption" ON consumption_daily;
    CREATE POLICY "Public read consumption" ON consumption_daily FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read facility daily" ON facility_daily;
    CREATE POLICY "Public read facility daily" ON facility_daily FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read test availability" ON test_availability;
    CREATE POLICY "Public read test availability" ON test_availability FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read alerts" ON alerts;
    CREATE POLICY "Public read alerts" ON alerts FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read transfers" ON transfer_proposals;
    CREATE POLICY "Public read transfers" ON transfer_proposals FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read stock transactions" ON stock_transactions;
    CREATE POLICY "Public read stock transactions" ON stock_transactions FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read agent logs" ON agent_logs;
    CREATE POLICY "Public read agent logs" ON agent_logs FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read notifications" ON notifications;
    CREATE POLICY "Public read notifications" ON notifications FOR SELECT USING (true);
END $$;

-- Enable Supabase Realtime publication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE facilities, stock, alerts, transfer_proposals, notifications;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

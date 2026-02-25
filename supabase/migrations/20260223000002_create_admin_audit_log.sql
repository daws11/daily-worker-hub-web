-- ============================================================================
-- Daily Worker Hub - Admin Audit Log Migration
-- ============================================================================
-- This migration creates the admin_audit_logs table for tracking all admin
-- actions for audit and compliance purposes.
-- Version: 20260223000002
-- Date: 2026-02-23
-- ============================================================================

-- ============================================================================
-- ALTER EXISTING ENUMS
-- ============================================================================

-- Add 'admin' role to user_role enum
-- First, we need to add the new value before any existing values to avoid reordering issues
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Admin audit logs table (tracks all admin actions)
-- ----------------------------------------------------------------------------
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB DEFAULT '{}'::jsonb,
  new_values JSONB DEFAULT '{}'::jsonb,
  reason TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Admin audit logs indexes
CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_entity_type ON admin_audit_logs(entity_type);
CREATE INDEX idx_admin_audit_logs_entity_id ON admin_audit_logs(entity_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);

-- Composite index for filtering by admin and action
CREATE INDEX idx_admin_audit_logs_admin_action ON admin_audit_logs(admin_id, action);

-- Composite index for filtering by entity type and id
CREATE INDEX idx_admin_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on admin_audit_logs table
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs" ON admin_audit_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::text = auth.uid()::text
    AND users.role = 'admin'
  )
);

-- Only admins can insert audit logs (typically done via database functions)
CREATE POLICY "Admins can insert audit logs" ON admin_audit_logs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::text = auth.uid()::text
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

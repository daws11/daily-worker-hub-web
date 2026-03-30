-- Migration: Create RLS audit helper tables and populate with audit data
-- Purpose: Make pg_tables and pg_policies data accessible via PostgREST for the RLS verification script.
-- This migration runs as the Postgres superuser so it CAN access system catalogs.
-- The tables it creates are normal public schema tables that PostgREST can query.

-- 1. Create rls_audit_tables table
CREATE TABLE IF NOT EXISTS public.rls_audit_tables (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  table_owner TEXT,
  schema_name TEXT NOT NULL DEFAULT 'public',
  has_indexes BOOLEAN DEFAULT false,
  has_rules BOOLEAN DEFAULT false,
  has_triggers BOOLEAN DEFAULT false,
  row_security BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (schema_name, table_name)
);

-- 2. Create rls_audit_policies table
CREATE TABLE IF NOT EXISTS public.rls_audit_policies (
  id SERIAL PRIMARY KEY,
  schema_name TEXT NOT NULL DEFAULT 'public',
  table_name TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  permissive BOOLEAN DEFAULT true,
  roles TEXT[],
  cmd TEXT DEFAULT 'SELECT',
  qual TEXT,
  with_check TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (schema_name, table_name, policy_name)
);

-- 3. Grant read access (service role bypasses RLS anyway, but good practice)
GRANT SELECT ON public.rls_audit_tables TO anon, authenticated, service_role;
GRANT SELECT ON public.rls_audit_policies TO anon, authenticated, service_role;

-- 4. Populate tables from system catalogs
-- Clear existing data and repopulate
TRUNCATE public.rls_audit_tables RESTART IDENTITY;
TRUNCATE public.rls_audit_policies RESTART IDENTITY;

-- Populate from pg_tables (RLS status)
INSERT INTO public.rls_audit_tables (table_name, table_owner, schema_name, has_indexes, has_rules, has_triggers, row_security)
SELECT
  t.tablename::TEXT,
  t.tableowner::TEXT,
  t.schemaname::TEXT,
  t.hasindexes,
  t.hasrules,
  t.hastriggers,
  t.rowsecurity
FROM pg_tables t
WHERE t.schemaname = 'public'
ON CONFLICT (schema_name, table_name) DO UPDATE SET
  table_owner = EXCLUDED.table_owner,
  has_indexes = EXCLUDED.has_indexes,
  has_rules = EXCLUDED.has_rules,
  has_triggers = EXCLUDED.has_triggers,
  row_security = EXCLUDED.row_security,
  created_at = NOW();

-- Populate from pg_policies (RLS policies)
INSERT INTO public.rls_audit_policies (schema_name, table_name, policy_name, permissive, roles, cmd, qual, with_check)
SELECT
  p.schemaname::TEXT,
  p.tablename::TEXT,
  p.policyname::TEXT,
  p.permissive,
  p.roles::TEXT[],
  p.cmd::TEXT,
  p.qual::TEXT,
  p.with_check::TEXT
FROM pg_policies p
WHERE p.schemaname = 'public'
ON CONFLICT (schema_name, table_name, policy_name) DO UPDATE SET
  permissive = EXCLUDED.permissive,
  roles = EXCLUDED.roles,
  cmd = EXCLUDED.cmd,
  qual = EXCLUDED.qual,
  with_check = EXCLUDED.with_check;

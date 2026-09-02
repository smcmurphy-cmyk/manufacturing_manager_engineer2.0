-- Supabase / PostgreSQL Migration Script for Dynamic Engineering Operations
-- Run this in your Supabase SQL Editor to provision all tables and indexes.

-- 1. Document Archives (Replaces local JSON archive logs; stores file pointers to C:\Apps\Reports)
CREATE TABLE IF NOT EXISTS document_archives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id TEXT NOT NULL,
  module_type TEXT NOT NULL, -- 'FAI', 'NCR', 'Audit', 'Calibration', 'Report'
  reference_number TEXT,     -- e.g. 'FAI-402', 'NCR-2026-042', 'CAL-DMM-04'
  server_path TEXT NOT NULL, -- The target folder path
  file_name TEXT NOT NULL,   -- Sanitized PDF filename
  full_path TEXT NOT NULL,   -- Complete filesystem pointer (e.g. C:\Apps\Reports\FAI\...)
  file_size_bytes BIGINT,
  file_size_formatted TEXT,
  operator_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_archives_module ON document_archives(module_type);
CREATE INDEX IF NOT EXISTS idx_doc_archives_ref ON document_archives(reference_number);
CREATE INDEX IF NOT EXISTS idx_doc_archives_logged_at ON document_archives(logged_at DESC);

-- 2. Asset Calibration Registry (Persists calibration tools, intervals, and statuses)
CREATE TABLE IF NOT EXISTS asset_registry (
  id TEXT PRIMARY KEY,
  asset_id TEXT UNIQUE NOT NULL,
  equipment_description TEXT NOT NULL,
  department_location TEXT NOT NULL,
  interval_days INT NOT NULL DEFAULT 180,
  last_completed TEXT NOT NULL,
  next_due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Operational / Calibrated',
  assigned_owner TEXT NOT NULL,
  alert_email TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_registry_status ON asset_registry(status);
CREATE INDEX IF NOT EXISTS idx_asset_registry_due ON asset_registry(next_due_date);

-- 3. Non-Conformance Reports (NCRs)
CREATE TABLE IF NOT EXISTS ncrs (
  id TEXT PRIMARY KEY,
  ncr_number TEXT UNIQUE NOT NULL,
  serial_number TEXT,
  assembly_part_number TEXT NOT NULL,
  assembly_revision TEXT NOT NULL,
  defect_description TEXT NOT NULL,
  standard_clause TEXT NOT NULL,
  severity TEXT NOT NULL,
  containment_date TEXT NOT NULL,
  root_cause_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  next_action TEXT NOT NULL,
  owner TEXT NOT NULL,
  created_at TEXT,
  last_edited_at TEXT,
  last_edited_by TEXT,
  root_cause_analysis TEXT,
  corrective_action_plan TEXT,
  saved_pdf_path TEXT,
  edit_history JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ncrs_status ON ncrs(status);
CREATE INDEX IF NOT EXISTS idx_ncrs_number ON ncrs(ncr_number);

-- 4. Compliance Audits
CREATE TABLE IF NOT EXISTS compliance_audits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  standard TEXT NOT NULL,
  cadence TEXT NOT NULL,
  last_completed TEXT NOT NULL,
  next_due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Compliant',
  lead_auditor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Operator Training Records
CREATE TABLE IF NOT EXISTS training_records (
  id TEXT PRIMARY KEY,
  operator_name TEXT NOT NULL,
  role TEXT NOT NULL,
  certification_title TEXT NOT NULL,
  standard_level TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  expiration_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Valid',
  contact_email TEXT NOT NULL,
  supervisor TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Engineering Pipeline Jobs (FAI)
CREATE TABLE IF NOT EXISTS engineering_jobs (
  id TEXT PRIMARY KEY,
  job_id TEXT UNIQUE NOT NULL,
  due_date TEXT NOT NULL,
  project_code TEXT,
  customer TEXT,
  quantity TEXT,
  assembly_name TEXT NOT NULL,
  part_number TEXT NOT NULL,
  revision TEXT NOT NULL,
  target_build_date TEXT,
  start_time TEXT,
  total_build_time_hours TEXT,
  status TEXT NOT NULL,
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  passed_test TEXT,
  passed_test_date TEXT,
  passed_qa TEXT,
  passed_qa_date TEXT,
  smt_line TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

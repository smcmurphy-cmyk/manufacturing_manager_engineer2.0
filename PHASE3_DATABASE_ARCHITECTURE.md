# Phase 3 Database Architecture & Dual-Storage Specification

## 1. Executive Summary & Core Objective

The purpose of this architecture is to decouple the application's runtime state (Asset Calibration Registry, Non-Conformance Reports, Audits, Training Certifications, and Engineering Jobs) from ephemeral React component memory while preserving the existing local/network drive PDF storage path (`BASE_REPORTS_DIR`).

### The Dual-Storage Model
In a regulated manufacturing environment (such as AS9100D / ISO 9001):
1. **Relational Database (PostgreSQL / Supabase)**:
   - Manages all structured, searchable, and relational business records (e.g., equipment IDs, calibration dates, status, tolerances, NCR details, audit clauses, operator certifications).
   - Acts as the single source of truth for real-time reads and writes across multiple shop-floor client terminals.
   - Stores the generated document metadata and exact disk file paths (`file_path`, `file_name`, `file_size_bytes`, `checksum`).

2. **Host Filesystem / Network Drive (`BASE_REPORTS_DIR`)**:
   - Continues to store binary artifacts: signed FAI inspection sheets, calibration certificates, CAPA sign-off documents, and audit pack ZIP archives.
   - Configured via:
     ```typescript
     const BASE_REPORTS_DIR = process.env.REPORTS_OUTPUT_DIR || 'C:\\Apps\\Reports';
     ```
   - Retains the exact directory hierarchy:
     - `C:\Apps\Reports\Calibration\`
     - `C:\Apps\Reports\FAI\`
     - `C:\Apps\Reports\Audits\`
     - `C:\Apps\Reports\NCRs\`
     - `C:\Apps\Reports\Training\`
     - `C:\Apps\Reports\AOI_SPI_Logs\`

---

## 2. System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Shop-Floor Client (Browser)                     │
│  - Asset Registry Table          - Calibration Modal Form              │
│  - NCR Tracking & CAPA Editor    - Real-time Status Badges             │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ 1. CRUD Registry Data           │ 2. Trigger PDF Generation
                   │    (JSON Payload)               │    & Transmit Base64
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Express Full-Stack Server                       │
│                           (Node.js / tsx)                              │
│                                                                        │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐ │
│  │   PostgreSQL / Supabase API   │   │     File Storage Controller   │ │
│  │  (pg Client / Connection Pool)│   │    (savePdfToFileSystem)      │ │
│  └───────────────┬───────────────┘   └───────────────┬───────────────┘ │
└──────────────────┼───────────────────────────────────┼─────────────────┘
                   │                                   │
                   │ SQL Queries                       │ Write Binary PDF Buffer
                   ▼                                   ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        PostgreSQL Database           │  │   Local/Network Filesystem   │
│  - assets & calibration_logs         │  │   BASE_REPORTS_DIR           │
│  - ncrs & ncr_edit_history           │  │   'C:\Apps\Reports'          │
│  - compliance_audits                 │  │   ├── Calibration/           │
│  - training_records                  │  │   ├── FAI/                   │
│  - job_orders                        │  │   ├── Audits/                │
│  │                                   │  │   └── NCRs/                  │
│  │ Pointer to File on Disk ──────────┼──►                              │
│  └───────────────────────────────────┘  └──────────────────────────────┘
```

---

## 3. Database Schema Design (PostgreSQL / Supabase DDL)

### 3.1 Equipment & Calibration Registry

```sql
-- 1. Equipment & Asset Registry
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(64) PRIMARY KEY,              -- e.g. 'ast-101' or UUID
    asset_tag VARCHAR(64) UNIQUE NOT NULL,    -- e.g. 'CAL-DMM-04'
    name VARCHAR(255) NOT NULL,              -- e.g. 'Keysight 34461A 6.5 Digit DMM'
    category VARCHAR(64) NOT NULL,           -- 'Multimeter', 'Torque Driver', 'Oscilloscope'
    model VARCHAR(128) NOT NULL,
    serial_number VARCHAR(128) NOT NULL,
    location VARCHAR(128) NOT NULL,          -- 'SMT Line 1 Test Bench', 'QC Lab'
    custodian VARCHAR(128) NOT NULL,         -- 'Lead Electronics Tech'
    calibration_interval_months INT NOT NULL DEFAULT 12,
    last_calibration_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Active', -- 'Active', 'Pending Calibration', 'Out of Service'
    calibration_vendor VARCHAR(255),         -- 'Transcat Calibration Services'
    certificate_number VARCHAR(128),
    certificate_file_path TEXT,              -- 'C:\Apps\Reports\Calibration\CAL-DMM-04_2026.pdf'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Calibration Audit History Log (Traceable Recalibration Records)
CREATE TABLE IF NOT EXISTS calibration_history (
    id BIGSERIAL PRIMARY KEY,
    asset_id VARCHAR(64) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    calibrated_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    technician_or_vendor VARCHAR(255) NOT NULL,
    certificate_number VARCHAR(128),
    as_found_condition VARCHAR(64) DEFAULT 'In Tolerance',
    as_left_condition VARCHAR(64) DEFAULT 'In Tolerance',
    notes TEXT,
    saved_pdf_path TEXT,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_due_date ON assets(next_due_date);
CREATE INDEX idx_assets_status ON assets(status);
```

### 3.2 Non-Conformance Reports (NCRs) & Revisions

```sql
-- 3. Non-Conformance Reports (AS9100D §8.7)
CREATE TABLE IF NOT EXISTS ncrs (
    id VARCHAR(64) PRIMARY KEY,
    ncr_number VARCHAR(64) UNIQUE NOT NULL,      -- e.g. 'NCR-2026-088'
    job_id VARCHAR(64) NOT NULL,
    assembly_number VARCHAR(128) NOT NULL,
    assembly_revision VARCHAR(32) NOT NULL,
    board_serial VARCHAR(128) NOT NULL,
    defect_description TEXT NOT NULL,
    standard_clause VARCHAR(128) NOT NULL,       -- 'AS9100D §8.7 / IPC-A-610G'
    severity VARCHAR(32) NOT NULL,              -- 'Minor', 'Major', 'Critical'
    containment_date DATE NOT NULL,
    root_cause_method VARCHAR(64) NOT NULL,      -- '5-Why', '8D', 'Fishbone'
    root_cause_analysis TEXT,
    corrective_action TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'Open', -- 'Open', 'In Development', 'Closed'
    next_action TEXT,
    owner VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_edited_by VARCHAR(128) NOT NULL
);

-- 4. NCR Revision Audit Trail
CREATE TABLE IF NOT EXISTS ncr_edit_history (
    id BIGSERIAL PRIMARY KEY,
    ncr_id VARCHAR(64) NOT NULL REFERENCES ncrs(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_by VARCHAR(128) NOT NULL,
    summary TEXT NOT NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32)
);
```

### 3.3 Compliance Audits & Training Matrix

```sql
-- 5. Compliance Audits (AS9100D / ISO 9001 / IPC-A-610)
CREATE TABLE IF NOT EXISTS compliance_audits (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    standard VARCHAR(64) NOT NULL,
    cadence VARCHAR(64) NOT NULL,
    last_audit_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    lead_auditor VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Compliant',
    findings_count INT NOT NULL DEFAULT 0,
    scope TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Operator Training & Certification Matrix
CREATE TABLE IF NOT EXISTS training_records (
    id VARCHAR(64) PRIMARY KEY,
    operator_name VARCHAR(128) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    standard VARCHAR(64) NOT NULL,
    certified_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    contact_email VARCHAR(255),
    supervisor VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.4 Report Archive Logs (Disk-to-DB Indexing)

```sql
-- 7. Document Archive Index (Mapping disk files in C:\Apps\Reports to DB)
CREATE TABLE IF NOT EXISTS document_archives (
    id VARCHAR(64) PRIMARY KEY,
    document_type VARCHAR(64) NOT NULL,          -- 'FAI', 'Calibration', 'Audit', 'NCR'
    reference_number VARCHAR(128) NOT NULL,      -- 'FAI-402', 'CAL-DMM-04', 'NCR-2026-088'
    file_name VARCHAR(255) NOT NULL,
    relative_path VARCHAR(255) NOT NULL,         -- 'Calibration/CAL-DMM-04_2026-09-02.pdf'
    full_disk_path TEXT NOT NULL,                -- 'C:\Apps\Reports\Calibration\CAL-DMM-04_2026-09-02.pdf'
    file_size_bytes BIGINT NOT NULL,
    file_size_formatted VARCHAR(32) NOT NULL,
    operator_or_author VARCHAR(128) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_archives_type ON document_archives(document_type);
CREATE INDEX idx_doc_archives_ref ON document_archives(reference_number);
```

---

## 4. Architectural Requirements to Keep `BASE_REPORTS_DIR` Working

### 4.1 Path Resolution & Environment Variables
In `server.ts` and `src/config/paths.ts`, the default reports path is updated to:
```typescript
const BASE_REPORTS_DIR = process.env.REPORTS_OUTPUT_DIR || 'C:\\Apps\\Reports';
```
When running on:
- **Windows Host Direct Execution**: The process writes directly to `C:\Apps\Reports\...`.
- **Docker / Cloud Run Container**: `REPORTS_OUTPUT_DIR` can point to `/app/saved_reports` or a mounted storage volume, with automatic directory fallback if the Windows path root does not exist on Unix.

### 4.2 Reusable File-Save Operation (`savePdfToFileSystem`)
The refactored file writer:
1. Normalizes the target directory under `BASE_REPORTS_DIR` (or module subfolder).
2. Sanitizes filenames.
3. Decodes Base64 buffers directly to disk.
4. Returns the exact full filesystem path, size, and formatted byte string.
5. **Database Step**: Inserts a corresponding row into `document_archives` linking the record ID (e.g. `ast-101`) to the created disk file.

---

## 5. Express API Layer Changes

To replace client-side in-memory React state with durable database persistence:

### 5.1 Endpoints to Implement

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/assets` | `GET` | Fetch all calibration assets (ordered by due date). |
| `/api/assets` | `POST` | Create a new asset record in PostgreSQL. |
| `/api/assets/:id` | `PUT` | Update asset calibration date, interval, or status. |
| `/api/assets/:id/calibrate` | `POST` | Record a calibration event, update next due date, and log history. |
| `/api/ncrs` | `GET` | Fetch all NCRs and their latest revision dates. |
| `/api/ncrs` | `POST` | Create a new NCR. |
| `/api/ncrs/:id` | `PUT` | Update NCR, record revision changelog into `ncr_edit_history`. |
| `/api/audits` | `GET` / `PUT` | Read and update compliance audit checklists. |
| `/api/training` | `GET` / `PUT` | Read and update operator training records. |
| `/api/reports/history` | `GET` | Fetch unified archive history directly from `document_archives`. |

### 5.2 Graceful Fallback Strategy (Offline / Local Dev)
If the database connection credentials (`DATABASE_URL` or `SUPABASE_URL`) are not yet configured:
1. The server automatically falls back to local disk-backed JSON cache files (`/saved_reports/data/assets.json`) initialized with `INITIAL_ASSETS`.
2. The UI displays an indicator: `Storage Mode: PostgreSQL Connected` vs. `Storage Mode: Local Server File Fallback`.
3. No user data is ever lost.

---

## 6. Frontend Integration Plan

1. **API Client Service (`src/services/api.ts`)**:
   - Centralize all fetch calls (`fetchAssets()`, `saveAsset()`, `fetchNcrs()`, `saveNcr()`).
2. **React Query / Hook Wrapper (`useAssets()`, `useNcrs()`)**:
   - Fetch data on initial load from `/api/assets`.
   - On edit/save in `CalibrationModal` or `EditNcrModal`, call the API and update React state immediately (optimistic UI update).
3. **Keep Client-Side `localStorage` Backup**:
   - Cache the latest query response in `localStorage` as a zero-latency fallback while hydrating.

---

## 7. Migration & Rollout Checklist

- [ ] **Step 1: Environment Configuration**
  - Add `DATABASE_URL` (or `SUPABASE_URL` + `SUPABASE_KEY`) to `.env.example`.
  - Ensure `REPORTS_OUTPUT_DIR=C:\Apps\Reports` is configured in environment setup.
- [ ] **Step 2: Database Initialization**
  - Execute the DDL schema script in PostgreSQL / Supabase.
  - Seed initial assets, NCRs, audits, and training data from `src/data/initialData.ts` if tables are empty.
- [ ] **Step 3: Server API Implementation**
  - Connect database client with connection pooling in `server.ts`.
  - Add the CRUD endpoints for `/api/assets`, `/api/ncrs`, `/api/audits`, `/api/training`.
- [ ] **Step 4: Frontend State Migration**
  - Replace `useState(INITIAL_ASSETS)` in `App.tsx` with asynchronous API fetching and mutation handlers.
  - Test asset edits, recalibrations, and verify persistence after page reload.
- [ ] **Step 5: File & PDF Path Verification**
  - Verify that generating calibration stickers or FAI PDFs saves to `C:\Apps\Reports\...` and logs the path in `document_archives`.

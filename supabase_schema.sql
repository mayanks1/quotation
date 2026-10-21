-- Tisha LED Walls Quotation Pro - Supabase PostgreSQL Schema
-- Run this in your Supabase Project -> "SQL Editor" -> Click "Run"

-- 1. Quotations Table
CREATE TABLE IF NOT EXISTS public.quotations (
  id TEXT PRIMARY KEY,
  quotation_number TEXT NOT NULL,
  quotation_date TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  event_date TEXT,
  venue TEXT,
  -- Document Type & Status
  status TEXT NOT NULL DEFAULT 'draft',
  document_type TEXT NOT NULL DEFAULT 'quotation',
  invoice_number TEXT,
  invoice_date TEXT,
  
  -- Soft Delete & Retention
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  
  -- Parties
  company JSONB NOT NULL,
  client JSONB NOT NULL,
  
  -- Financials
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  tax_scheme TEXT NOT NULL DEFAULT 'cgst_sgst',
  tax_rate NUMERIC NOT NULL DEFAULT 18,
  shipping_charges NUMERIC NOT NULL DEFAULT 0,
  
  -- Terms & Milestones
  notes TEXT,
  payment_terms TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup by quote number, status & trash
CREATE INDEX IF NOT EXISTS idx_quotations_quote_no ON public.quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_is_deleted ON public.quotations(is_deleted);
CREATE INDEX IF NOT EXISTS idx_quotations_updated ON public.quotations(updated_at DESC);

-- 1b. Reusable Quotation Packages & Presets Table
CREATE TABLE IF NOT EXISTS public.quotation_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  payment_terms TEXT,
  tax_scheme TEXT DEFAULT 'cgst_sgst',
  tax_rate NUMERIC DEFAULT 18,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access for quotation_templates" ON public.quotation_templates
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Clients Table (Address Book)
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  gstin TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

-- 3. Company Settings (Single row config & SaaS team metadata)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  profile JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Users Table (Team Users & Granular RBAC Permissions)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  phone TEXT,
  avatar TEXT,
  organization_id TEXT NOT NULL DEFAULT 'org_tisha_main',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Seed Team Members into public.users
INSERT INTO public.users (id, name, email, password, role, status, phone, organization_id, permissions)
VALUES 
(
  'usr_super_admin_tadmin',
  'Mayank Saini (Super Admin)',
  'admin@tishaledwalls.com',
  'admin@123',
  'owner',
  'active',
  '+91 7703948857',
  'org_tisha_main',
  '{"canEditBankDetails": true, "canDeleteQuotes": true, "canManageUsers": true, "canRestoreBackups": true, "canApplyDiscounts": true, "canManageClients": true, "canExportData": true}'::jsonb
),
(
  'usr_sales_mgr_02',
  'Pooja Verma',
  'sales@tishaledwalls.com',
  'sales123',
  'manager',
  'active',
  '+91 98200 54321',
  'org_tisha_main',
  '{"canEditBankDetails": false, "canDeleteQuotes": false, "canManageUsers": false, "canRestoreBackups": false, "canApplyDiscounts": true, "canManageClients": true, "canExportData": true}'::jsonb
),
(
  'usr_sales_exec_03',
  'Amit Kumar',
  'amit@tishaledwalls.com',
  'amit123',
  'member',
  'active',
  '+91 98300 11223',
  'org_tisha_main',
  '{"canEditBankDetails": false, "canDeleteQuotes": false, "canManageUsers": false, "canRestoreBackups": false, "canApplyDiscounts": false, "canManageClients": false, "canExportData": false}'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  permissions = EXCLUDED.permissions;

-- Alias table saas_users for backwards compatibility
CREATE TABLE IF NOT EXISTS public.saas_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  phone TEXT,
  avatar TEXT,
  organization_id TEXT NOT NULL DEFAULT 'org_tisha_main',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_login TIMESTAMPTZ
);

-- 6. Payment Ledger Table (Native PostgreSQL Ledger replacing Google Sheets)
CREATE TABLE IF NOT EXISTS public.payment_ledger (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org_tisha_main',
  
  -- Core Transaction Info
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name TEXT NOT NULL,
  client_id TEXT,
  
  -- Event & Screen Details
  event_venue TEXT,
  screen_size TEXT,
  
  -- Financial Ledger Calculations
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  pending_amount NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  
  -- Status: 'Received' | 'Partial' | 'Pending'
  status TEXT NOT NULL CHECK (status IN ('Received', 'Partial', 'Pending')),
  
  -- Payment Method & Traceability
  payment_mode TEXT DEFAULT 'unpaid',
  transaction_ref TEXT,
  notes TEXT,
  
  -- Quotation Link (Set ONLY when auto-generated from an Invoiced Quotation)
  linked_quotation_id TEXT UNIQUE,
  invoice_number TEXT,
  
  -- Soft-Delete & 30-Day Retention Trash Management
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ledger Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_org ON public.payment_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON public.payment_ledger(date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_client ON public.payment_ledger(client_name);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON public.payment_ledger(status);
CREATE INDEX IF NOT EXISTS idx_ledger_is_deleted ON public.payment_ledger(is_deleted);
CREATE INDEX IF NOT EXISTS idx_ledger_linked_quote ON public.payment_ledger(linked_quotation_id);

-- 5. Enable Row Level Security (RLS) & Allow public read/write with anon key for this tenant
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access for quotations" ON public.quotations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access for clients" ON public.clients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access for company_settings" ON public.company_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access for users" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access for saas_users" ON public.saas_users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access for payment_ledger" ON public.payment_ledger
  FOR ALL USING (true) WITH CHECK (true);




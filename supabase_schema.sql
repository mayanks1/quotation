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
  status TEXT NOT NULL DEFAULT 'draft',
  
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

-- Index for fast lookup by quote number & status
CREATE INDEX IF NOT EXISTS idx_quotations_quote_no ON public.quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_updated ON public.quotations(updated_at DESC);

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

-- 3. Company Settings (Single row config)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  profile JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Enable Row Level Security (RLS) & Allow public read/write with anon key for this tenant
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access for quotations" ON public.quotations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access for clients" ON public.clients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access for company_settings" ON public.company_settings
  FOR ALL USING (true) WITH CHECK (true);

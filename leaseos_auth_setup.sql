-- ================================================================
-- LeaseOS Invoicing — FINAL Auth Setup
-- Run this ENTIRE script in Supabase SQL Editor
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- STEP 1: Ensure module_users has all required columns
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.module_users
  ADD COLUMN IF NOT EXISTS status          text         NOT NULL DEFAULT 'active';

ALTER TABLE public.module_users
  ADD COLUMN IF NOT EXISTS first_name      VARCHAR(100) DEFAULT '';

ALTER TABLE public.module_users
  ADD COLUMN IF NOT EXISTS last_name       VARCHAR(100) DEFAULT '';

ALTER TABLE public.module_users
  ADD COLUMN IF NOT EXISTS contact_number  VARCHAR(20)  DEFAULT '';

-- Index for fast email lookup
CREATE INDEX IF NOT EXISTS idx_module_users_email_modulename
  ON public.module_users (email, module_name);

-- RLS
ALTER TABLE public.module_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "module_users_self_read" ON public.module_users;
CREATE POLICY "module_users_self_read"
  ON public.module_users
  FOR SELECT
  USING (email = (auth.jwt() ->> 'email'));


-- ────────────────────────────────────────────────────────────────
-- STEP 2: Helper function for RLS
-- ────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.current_user_company_id();

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT company_id::bigint
  FROM   public.module_users
  WHERE  email  = (auth.jwt() ->> 'email')
    AND  status = 'active'
  LIMIT  1;
$$;


-- ────────────────────────────────────────────────────────────────
-- STEP 3: RLS on invoicing tables
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.leaseos_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_company_isolation" ON public.leaseos_invoices;
CREATE POLICY "invoices_company_isolation"
  ON public.leaseos_invoices FOR ALL
  USING     (company_id::bigint = public.current_user_company_id())
  WITH CHECK (company_id::bigint = public.current_user_company_id());

ALTER TABLE public.leaseos_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collections_company_isolation" ON public.leaseos_collections;
CREATE POLICY "collections_company_isolation"
  ON public.leaseos_collections FOR ALL
  USING     (company_id::bigint = public.current_user_company_id())
  WITH CHECK (company_id::bigint = public.current_user_company_id());


-- ────────────────────────────────────────────────────────────────
-- STEP 4: revenue_share_entries
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.revenue_share_entries (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id              uuid          NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  invoice_no            text,
  sales_amount          numeric(14,2) NOT NULL DEFAULT 0,
  percentage            numeric(5,2)  NOT NULL DEFAULT 0,
  calculated_amount     numeric(14,2) NOT NULL DEFAULT 0,
  billing_month         text,
  reconciliation_status text          NOT NULL DEFAULT 'Pending',
  created_at            timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_share_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "revshare_company_isolation" ON public.revenue_share_entries;
CREATE POLICY "revshare_company_isolation"
  ON public.revenue_share_entries FOR ALL
  USING (
    lease_id IN (
      SELECT l.id FROM public.leases l
      JOIN   public.projects p ON p.id = l.project_id
      WHERE  p.company_id::bigint = public.current_user_company_id()
    )
  );


-- ────────────────────────────────────────────────────────────────
-- STEP 5: Enable Realtime on company_users
-- ────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.company_users;


-- ────────────────────────────────────────────────────────────────
-- STEP 6: verify_module_user — Fallback login via bcrypt check
--
-- DMAIC uses bcryptjs which generates $2b$ hashes.
-- pgcrypto crypt() requires $2a$ prefix.
-- We replace $2b$ with $2a$ before verification (identical algorithm).
-- ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS public.verify_module_user(text, text);

CREATE OR REPLACE FUNCTION public.verify_module_user(
  p_email    text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user      public.module_users%ROWTYPE;
  v_hash      text;
  v_company   record;
BEGIN
  -- Find active user by email (case-insensitive)
  SELECT * INTO v_user
  FROM   public.module_users
  WHERE  lower(trim(email)) = lower(trim(p_email))
    AND  status = 'active'
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found. Check the email address.'
    );
  END IF;

  IF v_user.password_hash IS NULL OR length(trim(v_user.password_hash)) = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No password set. Contact your admin.'
    );
  END IF;

  -- Normalize hash: bcryptjs uses $2b$, pgcrypto crypt() needs $2a$
  v_hash := replace(v_user.password_hash, '$2b$', '$2a$');

  -- Verify bcrypt password
  IF crypt(p_password, v_hash) <> v_hash THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Wrong password. Please try again.'
    );
  END IF;

  -- Fetch company details
  SELECT company_name INTO v_company
  FROM   public.company_users
  WHERE  id::text = v_user.company_id::text
  LIMIT  1;

  RETURN json_build_object(
    'success',        true,
    'email',          v_user.email,
    'company_id',     v_user.company_id,
    'company_name',   COALESCE(v_company.company_name, ''),
    'module_name',    v_user.module_name,
    'first_name',     COALESCE(v_user.first_name, ''),
    'last_name',      COALESCE(v_user.last_name, ''),
    'contact_number', COALESCE(v_user.contact_number, '')
  );
END;
$$;

-- Allow frontend (anon/authenticated) to call this RPC
GRANT EXECUTE ON FUNCTION public.verify_module_user(text, text) TO anon, authenticated;


-- ────────────────────────────────────────────────────────────────
-- STEP 7: DIAGNOSTIC — Run this to verify setup
-- Replace 'user@example.com' with the actual test user email
-- ────────────────────────────────────────────────────────────────

-- Check if user exists in module_users:
SELECT
  id,
  email,
  module_name,
  status,
  company_id,
  LEFT(password_hash, 7) AS hash_prefix,  -- shows $2b$12$ or $2a$12$
  first_name,
  last_name,
  created_at
FROM public.module_users
ORDER BY created_at DESC
LIMIT 10;

-- ================================================================
-- DONE.
-- After running, test the RPC from SQL Editor:
--   SELECT public.verify_module_user('user@email.com', 'their_password');
-- ================================================================

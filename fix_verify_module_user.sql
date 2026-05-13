-- ================================================================
-- CRITICAL FIX: Update verify_module_user to return permissions
-- Run this in Supabase SQL Editor
-- ================================================================

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
  v_perms     jsonb;
BEGIN
  -- Find active user by email (case-insensitive)
  SELECT * INTO v_user
  FROM   public.module_users
  WHERE  lower(trim(email)) = lower(trim(p_email))
    AND  status = 'active'
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found. Check the email address.');
  END IF;

  IF v_user.password_hash IS NULL OR length(trim(v_user.password_hash)) = 0 THEN
    RETURN json_build_object('success', false, 'message', 'No password set. Contact your admin.');
  END IF;

  -- Normalize hash: bcryptjs uses $2b$, pgcrypto crypt() needs $2a$
  v_hash := replace(v_user.password_hash, '$2b$', '$2a$');

  -- Verify bcrypt password
  IF crypt(p_password, v_hash) <> v_hash THEN
    RETURN json_build_object('success', false, 'message', 'Wrong password. Please try again.');
  END IF;

  -- ── Resolve invoicing permissions ──────────────────────────────────────────
  -- Handles both Strategy A (flat) and Strategy B (_modules JSON array)
  v_perms := v_user.permissions;

  IF v_perms IS NOT NULL AND (v_perms ? '_modules') THEN
    -- Strategy B: find the invoicing module inside the _modules array
    SELECT elem->'permissions' INTO v_perms
    FROM jsonb_array_elements(v_perms->'_modules') AS elem
    WHERE elem->>'module_name' = 'invoicing'
    LIMIT 1;
  END IF;

  -- If module_name is 'invoicing' and permissions is flat (Strategy A), use as-is
  -- (v_perms already contains the flat permissions from v_user.permissions)

  -- Default if nothing found
  IF v_perms IS NULL THEN
    v_perms := '{"view": true, "edit": false, "delete": false}'::jsonb;
  END IF;

  -- ── Fetch company details ────────────────────────────────────────────────
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
    'permissions',    v_perms,
    'first_name',     COALESCE(v_user.first_name, ''),
    'last_name',      COALESCE(v_user.last_name, ''),
    'contact_number', COALESCE(v_user.contact_number, '')
  );
END;
$$;

-- Allow frontend (anon/authenticated) to call this RPC
GRANT EXECUTE ON FUNCTION public.verify_module_user(text, text) TO anon, authenticated;

-- ================================================================
-- DONE. Test with:
-- SELECT public.verify_module_user('user@email.com', 'password');
-- The result should now include "permissions": {"view":true,"edit":true,...}
-- ================================================================

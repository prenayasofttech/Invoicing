-- ================================================================
-- FINAL PERMISSION FIX: Case-insensitive and robust lookup
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
  v_mod_entry jsonb;
BEGIN
  -- Find active user by email (case-insensitive)
  SELECT * INTO v_user
  FROM   public.module_users
  WHERE  lower(trim(email)) = lower(trim(p_email))
    AND  status = 'active'
  ORDER BY (module_name = 'invoicing') DESC, created_at DESC
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found.');
  END IF;

  IF v_user.password_hash IS NULL OR length(trim(v_user.password_hash)) = 0 THEN
    RETURN json_build_object('success', false, 'message', 'No password set.');
  END IF;

  -- Normalize hash: bcryptjs uses $2b$, pgcrypto crypt() needs $2a$
  v_hash := replace(v_user.password_hash, '$2b$', '$2a$');

  -- Verify bcrypt password
  IF crypt(p_password, v_hash) <> v_hash THEN
    RETURN json_build_object('success', false, 'message', 'Wrong password.');
  END IF;

  -- ── Resolve invoicing permissions ──────────────────────────────────────────
  v_perms := v_user.permissions;

  -- Case 1: Check if the row itself is for invoicing
  IF lower(v_user.module_name) = 'invoicing' AND NOT (v_perms ? '_modules') THEN
    v_perms := v_user.permissions;
  -- Case 2: Check if there's a _modules array (Strategy B)
  ELSIF (v_perms ? '_modules') THEN
    SELECT elem->'permissions' INTO v_perms
    FROM jsonb_array_elements(v_perms->'_modules') AS elem
    WHERE lower(elem->>'module_name') = 'invoicing'
    LIMIT 1;
  END IF;

  -- Ensure result is a valid object with booleans
  IF v_perms IS NULL THEN
    v_perms := '{"view": true, "edit": false, "delete": false}'::jsonb;
  ELSE
    -- Backfill missing keys for robustness
    v_perms := jsonb_build_object(
      'view',   COALESCE((v_perms->>'view')::boolean, true),
      'edit',   COALESCE((v_perms->>'edit')::boolean, false),
      'delete', COALESCE((v_perms->>'delete')::boolean, false)
    );
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

GRANT EXECUTE ON FUNCTION public.verify_module_user(text, text) TO anon, authenticated;

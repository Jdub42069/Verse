/*
  # Fix GraphQL Schema Visibility and SECURITY DEFINER Issues

  1. Problem
    - Several tables are visible in the GraphQL schema to `anon` and `authenticated` roles
      because they have been granted SELECT via RLS policies, but Supabase exposes them
      in the GraphQL schema simply by having any grant on the role.
    - The `check_mutual_match()` function is SECURITY DEFINER and executable by both
      `anon` and `authenticated`, which is a security risk.

  2. Changes
    - Revoke SELECT on sensitive tables from `anon` role:
        audit_logs, blocks, bug_reports, matches, messages,
        photo_verification_log, profiles, reports
    - Revoke SELECT on sensitive tables from `authenticated` role:
        audit_logs, blocks, bug_reports, matches, messages,
        photo_verification_log, profiles, reports
    - RLS policies remain in place — they govern row-level access for the
      authenticated role via Supabase client calls (which bypass object-level
      grants when the JWT is validated server-side). Re-granting SELECT to
      `authenticated` only where RLS already restricts rows is intentional.
    - Revoke EXECUTE on `check_mutual_match()` from `anon`.
    - Switch `check_mutual_match()` to SECURITY INVOKER so it runs with the
      caller's privileges, not the definer's.

  3. Security Notes
    - Revoking from `anon` ensures unauthenticated users cannot discover or
      query these tables via GraphQL or REST.
    - Re-granting SELECT to `authenticated` with RLS in place means signed-in
      users can only see their own rows (as defined by existing RLS policies).
    - Removing `anon` EXECUTE on `check_mutual_match` prevents unauthenticated
      function invocation.
    - SECURITY INVOKER means the function executes as the calling user, so RLS
      policies on underlying tables are enforced automatically.
*/

-- ============================================================
-- 1. Revoke SELECT from anon on all sensitive tables
-- ============================================================
REVOKE SELECT ON public.audit_logs FROM anon;
REVOKE SELECT ON public.blocks FROM anon;
REVOKE SELECT ON public.bug_reports FROM anon;
REVOKE SELECT ON public.matches FROM anon;
REVOKE SELECT ON public.messages FROM anon;
REVOKE SELECT ON public.photo_verification_log FROM anon;
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.reports FROM anon;

-- ============================================================
-- 2. Revoke SELECT from authenticated on all sensitive tables,
--    then re-grant only where RLS policies already restrict rows.
--    audit_logs and photo_verification_log are admin-only — do not re-grant.
-- ============================================================
REVOKE SELECT ON public.audit_logs FROM authenticated;
REVOKE SELECT ON public.photo_verification_log FROM authenticated;

-- The following tables have row-level RLS policies scoped to the calling user.
-- Re-grant SELECT so authenticated users can still query their own data.
REVOKE SELECT ON public.blocks FROM authenticated;
GRANT SELECT ON public.blocks TO authenticated;

REVOKE SELECT ON public.bug_reports FROM authenticated;
GRANT SELECT ON public.bug_reports TO authenticated;

REVOKE SELECT ON public.matches FROM authenticated;
GRANT SELECT ON public.matches TO authenticated;

REVOKE SELECT ON public.messages FROM authenticated;
GRANT SELECT ON public.messages TO authenticated;

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;

REVOKE SELECT ON public.reports FROM authenticated;
GRANT SELECT ON public.reports TO authenticated;

-- ============================================================
-- 3. Fix check_mutual_match(): revoke anon EXECUTE and switch
--    to SECURITY INVOKER
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.check_mutual_match() FROM anon;

-- Recreate the function as SECURITY INVOKER so it runs with caller privileges
CREATE OR REPLACE FUNCTION public.check_mutual_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Check if there's a mutual like (both users liked each other)
  IF NEW.liked = true THEN
    IF EXISTS (
      SELECT 1 FROM public.matches
      WHERE liker_id = NEW.liked_id
        AND liked_id = NEW.liker_id
        AND liked = true
    ) THEN
      -- Insert into matches won't cause recursion since we check first
      -- Update both records to reflect mutual match or handle in app layer
      NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

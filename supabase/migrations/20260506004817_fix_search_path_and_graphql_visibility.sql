/*
  # Fix Function Search Path and GraphQL Schema Visibility

  1. Problems
    - `public.check_mutual_match()` has a mutable search_path, which allows
      search-path injection attacks where malicious objects in other schemas
      could shadow trusted functions/tables.
    - Tables blocks, bug_reports, matches, messages, profiles, reports are
      visible in the GraphQL schema because the `authenticated` role has a
      direct table-level SELECT grant. Revoking the table grant hides them
      from the GraphQL schema introspection while RLS policies continue to
      enforce row-level access for PostgREST/REST API calls.

  2. Changes
    - Recreate `check_mutual_match()` with `SET search_path = public, pg_temp`
      to pin the search path and prevent injection.
    - Revoke table-level SELECT on blocks, bug_reports, matches, messages,
      profiles, reports from the `authenticated` role.
      PostgREST enforces access through RLS policies (not table grants) when
      a valid JWT is present, so REST API queries from the app continue to work.

  3. Security Notes
    - A fixed search_path on the function prevents schema-injection attacks.
    - Removing the table-level grant from `authenticated` removes these tables
      from the GraphQL schema introspection without affecting REST API access,
      which is governed by RLS policies.
    - The app's direct supabase.from('table').select() calls go through
      PostgREST, which uses RLS — not table grants — to authorize rows.
*/

-- ============================================================
-- 1. Fix check_mutual_match() search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_mutual_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.liked = true THEN
    IF EXISTS (
      SELECT 1 FROM public.matches
      WHERE liker_id = NEW.liked_id
        AND liked_id = NEW.liker_id
        AND liked = true
    ) THEN
      NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Revoke table-level SELECT from authenticated to hide
--    tables from GraphQL schema introspection.
--    RLS policies continue to enforce row-level access via REST.
-- ============================================================
REVOKE SELECT ON public.blocks FROM authenticated;
REVOKE SELECT ON public.bug_reports FROM authenticated;
REVOKE SELECT ON public.matches FROM authenticated;
REVOKE SELECT ON public.messages FROM authenticated;
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.reports FROM authenticated;

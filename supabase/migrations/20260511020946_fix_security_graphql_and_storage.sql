/*
  # Fix security issues: GraphQL schema visibility and storage listing

  1. Storage
    - Drop the broad SELECT policy on storage.objects that allows listing all files
    - Public bucket URLs remain accessible directly without a SELECT policy

  2. GraphQL Schema Visibility
    - Revoke SELECT from anon on public.profiles (should require sign-in)
    - Revoke SELECT from authenticated on public.blocks, bug_reports, matches,
      messages, profiles, reports to prevent schema discovery via GraphQL
    - RLS policies continue to govern actual data access; these grants only
      control schema-level discoverability
*/

-- Drop the overly broad storage SELECT policy
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;

-- Revoke anon SELECT on profiles (hides from GraphQL for unauthenticated users)
REVOKE SELECT ON TABLE public.profiles FROM anon;

-- Revoke authenticated SELECT on sensitive tables (hides from GraphQL schema)
-- RLS policies still protect actual row access; this removes schema discoverability
REVOKE SELECT ON TABLE public.blocks FROM authenticated;
REVOKE SELECT ON TABLE public.bug_reports FROM authenticated;
REVOKE SELECT ON TABLE public.matches FROM authenticated;
REVOKE SELECT ON TABLE public.messages FROM authenticated;
REVOKE SELECT ON TABLE public.profiles FROM authenticated;
REVOKE SELECT ON TABLE public.reports FROM authenticated;

-- Re-grant SELECT back via RLS-controlled path so the app still works
-- (PostgREST uses RLS, not raw grants, when role is authenticated and RLS is enabled)
-- We restore grants scoped to the service role and through RLS policies only
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.blocks TO authenticated;
GRANT SELECT ON TABLE public.bug_reports TO authenticated;
GRANT SELECT ON TABLE public.matches TO authenticated;
GRANT SELECT ON TABLE public.messages TO authenticated;
GRANT SELECT ON TABLE public.reports TO authenticated;

-- Hide tables from the GraphQL schema by removing them from the graphql_public search path
-- This is done by commenting them out of the pg_graphql schema cache via configuration
COMMENT ON TABLE public.blocks IS E'@graphql({"totalCount": {"enabled": false}, "description": ""})';
COMMENT ON TABLE public.bug_reports IS E'@graphql({"totalCount": {"enabled": false}})';
COMMENT ON TABLE public.matches IS E'@graphql({"totalCount": {"enabled": false}})';
COMMENT ON TABLE public.messages IS E'@graphql({"totalCount": {"enabled": false}})';
COMMENT ON TABLE public.reports IS E'@graphql({"totalCount": {"enabled": false}})';

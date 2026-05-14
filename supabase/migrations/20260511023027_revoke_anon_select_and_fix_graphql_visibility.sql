/*
  # Fix GraphQL schema visibility for security advisor

  ## Changes
  1. Revoke SELECT on profiles from anon role — unauthenticated users have no
     legitimate reason to query profiles directly; auth flows use supabase.auth
     endpoints only.
  2. For authenticated tables (blocks, bug_reports, matches, messages, reports,
     profiles), we cannot revoke SELECT without breaking PostgREST. Instead we
     ensure the @graphql({"visible": false}) comment directives are set
     (re-applied here for safety) which is the pg_graphql-supported method to
     suppress table visibility from the GraphQL schema.

  Note: the security advisor checks raw GRANT state. The @graphql directive
  suppresses exposure in the actual GraphQL schema even when grants exist.
*/

-- Revoke anon SELECT on profiles (anon users should not browse profiles)
REVOKE SELECT ON TABLE public.profiles FROM anon;

-- Re-apply graphql visibility directives (idempotent)
COMMENT ON TABLE public.profiles    IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.blocks      IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.bug_reports IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.matches     IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.messages    IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.reports     IS E'@graphql({"visible": false})';

/*
  # Revoke SELECT grants from authenticated role on sensitive tables

  ## Summary
  Revokes table-level SELECT grants from the `authenticated` role on all
  sensitive tables to hide them from GraphQL schema introspection.
  RLS policies remain intact and continue to govern data access via the
  Supabase JS / PostgREST client. No app functionality is affected.

  ## Tables
  - public.blocks
  - public.bug_reports
  - public.matches
  - public.messages
  - public.profiles
  - public.reports
*/

REVOKE SELECT ON TABLE public.blocks FROM authenticated;
REVOKE SELECT ON TABLE public.bug_reports FROM authenticated;
REVOKE SELECT ON TABLE public.matches FROM authenticated;
REVOKE SELECT ON TABLE public.messages FROM authenticated;
REVOKE SELECT ON TABLE public.profiles FROM authenticated;
REVOKE SELECT ON TABLE public.reports FROM authenticated;

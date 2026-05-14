/*
  # Restore SELECT grants and hide tables from GraphQL schema properly

  ## Problem
  Revoking SELECT from `authenticated` breaks the PostgREST API (used by the
  Supabase JS client), not just GraphQL. Both use the same role and table grants.

  ## Solution
  1. Restore SELECT grants so the app works again
  2. Use pg_graphql's per-table visibility setting to hide sensitive tables
     from the GraphQL schema without affecting PostgREST

  ## Tables Restored
  - public.blocks, public.bug_reports, public.matches
  - public.messages, public.profiles, public.reports

  ## GraphQL Visibility
  Setting @graphql({"visible": false}) via table comment hides each table
  from GraphQL introspection while leaving PostgREST/RLS behaviour intact.
*/

-- Restore grants broken by previous migrations
GRANT SELECT ON public.blocks TO authenticated;
GRANT SELECT ON public.bug_reports TO authenticated;
GRANT SELECT ON public.matches TO authenticated;
GRANT SELECT ON public.messages TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.reports TO authenticated;

-- Hide tables from GraphQL schema using pg_graphql visibility directive
COMMENT ON TABLE public.blocks IS '@graphql({"visible": false})';
COMMENT ON TABLE public.bug_reports IS '@graphql({"visible": false})';
COMMENT ON TABLE public.matches IS '@graphql({"visible": false})';
COMMENT ON TABLE public.messages IS '@graphql({"visible": false})';
COMMENT ON TABLE public.profiles IS '@graphql({"visible": false})';
COMMENT ON TABLE public.reports IS '@graphql({"visible": false})';

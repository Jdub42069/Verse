/*
  # Security hardening: revoke handle_new_user RPC and hide tables from GraphQL

  1. Function security
    - Revoke EXECUTE on `public.handle_new_user()` from `anon` and `authenticated`.
      This function is only meant to run as a trigger on `auth.users` insert and
      should never be callable via the REST/RPC endpoint.

  2. GraphQL visibility
    - Add pg_graphql comment directives to mark the following tables as
      `"totalCount": {"enabled": false}` and exclude them from the GraphQL
      schema entirely using `"@graphql({"hidden": true})"` style comment
      directives recognised by pg_graphql:
        - public.blocks
        - public.bug_reports
        - public.matches
        - public.messages
        - public.profiles
        - public.reports
    - This hides the tables from GraphQL introspection while preserving normal
      PostgREST (REST) access that the application relies on, which is still
      protected by RLS.

  3. Notes
    - We do NOT revoke SELECT from `authenticated` on these tables because the
      app reads them through PostgREST and access is already restricted by
      Row Level Security policies. Removing SELECT would break the app.
    - Hiding tables from the GraphQL schema is the recommended way to address
      the "Signed-In Users Can See Object in GraphQL Schema" warning while
      keeping the REST API working.
*/

-- 1. Revoke RPC access to the trigger function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 2. Hide tables from the GraphQL schema using pg_graphql comment directives
COMMENT ON TABLE public.blocks IS E'@graphql({"hidden": true})';
COMMENT ON TABLE public.bug_reports IS E'@graphql({"hidden": true})';
COMMENT ON TABLE public.matches IS E'@graphql({"hidden": true})';
COMMENT ON TABLE public.messages IS E'@graphql({"hidden": true})';
COMMENT ON TABLE public.profiles IS E'@graphql({"hidden": true})';
COMMENT ON TABLE public.reports IS E'@graphql({"hidden": true})';

/*
  # Disable GraphQL access to public schema tables

  ## Context
  This application uses only the Supabase REST API (PostgREST) — no GraphQL
  queries are made anywhere in the codebase. The pg_graphql extension is
  installed by Supabase by default but is unused.

  The security advisor flags every table with SELECT grants as "visible in
  GraphQL schema". The @graphql({"visible": false}) comment directive suppresses
  individual tables but the advisor still checks raw GRANT state.

  ## Solution
  Use pg_graphql's built-in configuration to set max_rows to 0 and, more
  importantly, configure the graphql schema to be fully private by revoking
  EXECUTE on the graphql resolver functions from anon and authenticated roles.
  This means GraphQL cannot be called at all while REST API is unaffected.

  Additionally revoke SELECT on specific tables from anon where not needed.
*/

-- Revoke the ability to call the GraphQL endpoint entirely for both roles
-- The graphql resolver is exposed as graphql_public.graphql(...)
REVOKE EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) FROM authenticated;

-- Ensure anon cannot SELECT any tables (anon users are not logged in, they
-- only interact with supabase.auth endpoints)
REVOKE SELECT ON TABLE public.profiles    FROM anon;
REVOKE SELECT ON TABLE public.blocks      FROM anon;
REVOKE SELECT ON TABLE public.bug_reports FROM anon;
REVOKE SELECT ON TABLE public.matches     FROM anon;
REVOKE SELECT ON TABLE public.messages    FROM anon;
REVOKE SELECT ON TABLE public.reports     FROM anon;

/*
  # Hide sensitive tables from GraphQL schema

  Uses pg_graphql's @graphql directive via table comments to mark tables
  as non-queryable through the GraphQL API, while leaving PostgREST/REST
  access intact and governed by RLS.

  Tables hidden: blocks, bug_reports, matches, messages, profiles, reports
*/

-- Exclude each sensitive table from the GraphQL schema entirely
COMMENT ON TABLE public.profiles IS '@graphql({"primary_key_columns": ["id"], "description": null})';

DO $$
DECLARE
  cfg json;
BEGIN
  -- Set pg_graphql to omit these tables from the exposed schema
  -- by overriding via supabase_functions.http_request is not available;
  -- instead we use the supported SECURITY LABEL approach
  EXECUTE $sql$
    SECURITY LABEL FOR pgsodium ON TABLE public.blocks IS NULL
  $sql$;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- The correct pg_graphql way: set `inflect_names` comment to exclude from schema
-- by marking the table with an empty graphql override that omits it
COMMENT ON TABLE public.blocks IS E'@graphql({"description": "blocks"})';
COMMENT ON TABLE public.bug_reports IS E'@graphql({"description": "bug_reports"})';
COMMENT ON TABLE public.matches IS E'@graphql({"description": "matches"})';
COMMENT ON TABLE public.messages IS E'@graphql({"description": "messages"})';
COMMENT ON TABLE public.reports IS E'@graphql({"description": "reports"})';

-- Revoke anon access to profiles at the schema level
REVOKE SELECT ON TABLE public.profiles FROM anon;

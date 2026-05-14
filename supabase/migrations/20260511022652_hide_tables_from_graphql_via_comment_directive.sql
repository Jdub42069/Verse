/*
  # Hide sensitive tables from GraphQL schema using pg_graphql directives

  ## Problem
  Revoking SELECT grants hides tables from GraphQL but also breaks PostgREST
  (the REST API), since PostgREST requires the same SELECT grant to serve data.

  ## Solution
  Use pg_graphql's @graphql table comment directive with `"visible": false`.
  This hides the table from the GraphQL schema entirely while leaving SELECT
  grants intact so PostgREST continues to work normally.

  ## Tables hidden from GraphQL
  - public.profiles (hidden from both anon and authenticated)
  - public.blocks
  - public.bug_reports
  - public.matches
  - public.messages
  - public.reports
*/

COMMENT ON TABLE public.profiles    IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.blocks      IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.bug_reports IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.matches     IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.messages    IS E'@graphql({"visible": false})';
COMMENT ON TABLE public.reports     IS E'@graphql({"visible": false})';

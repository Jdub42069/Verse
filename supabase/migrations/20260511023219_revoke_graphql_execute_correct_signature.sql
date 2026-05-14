/*
  # Revoke GraphQL execution rights with correct function signature

  Revokes EXECUTE on the graphql_public.graphql function using the correct
  parameter signature discovered from pg_proc. This prevents anon and
  authenticated roles from calling the GraphQL endpoint entirely.
*/

REVOKE EXECUTE ON FUNCTION graphql_public.graphql(
  "operationName" text,
  query text,
  variables jsonb,
  extensions jsonb
) FROM anon;

REVOKE EXECUTE ON FUNCTION graphql_public.graphql(
  "operationName" text,
  query text,
  variables jsonb,
  extensions jsonb
) FROM authenticated;

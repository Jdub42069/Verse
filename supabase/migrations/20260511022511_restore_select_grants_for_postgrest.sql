/*
  # Restore SELECT grants for PostgREST (REST API)

  Revoking SELECT at the table level also broke PostgREST, not just GraphQL.
  PostgREST requires the role to have SELECT privilege on the table in addition
  to RLS policies.

  We restore SELECT grants here. To hide tables from the GraphQL schema we rely
  on the pg_graphql `@graphql({"visible": false})` table comment approach instead,
  which hides tables from GraphQL without affecting PostgREST.
*/

-- Restore SELECT grants so PostgREST / REST API works again
GRANT SELECT ON TABLE public.profiles    TO authenticated;
GRANT SELECT ON TABLE public.profiles    TO anon;
GRANT SELECT ON TABLE public.blocks      TO authenticated;
GRANT SELECT ON TABLE public.bug_reports TO authenticated;
GRANT SELECT ON TABLE public.matches     TO authenticated;
GRANT SELECT ON TABLE public.messages    TO authenticated;
GRANT SELECT ON TABLE public.reports     TO authenticated;

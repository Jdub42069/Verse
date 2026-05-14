/*
  # Restore SELECT grants for authenticated role

  The previous security migration revoked SELECT on several tables from the
  authenticated role to hide them from GraphQL introspection. However, PostgREST
  requires the table-level SELECT grant to exist alongside RLS policies — without
  it, authenticated users cannot read any rows at all, causing infinite loading.

  This migration restores SELECT for authenticated on all affected tables.
  RLS policies continue to enforce row-level access.
*/

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.messages TO authenticated;
GRANT SELECT ON public.matches TO authenticated;
GRANT SELECT ON public.blocks TO authenticated;
GRANT SELECT ON public.bug_reports TO authenticated;
GRANT SELECT ON public.reports TO authenticated;

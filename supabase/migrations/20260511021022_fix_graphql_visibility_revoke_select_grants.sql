/*
  # Fix GraphQL schema visibility by revoking direct SELECT grants

  ## Problem
  pg_graphql exposes a table in the schema whenever the calling role has a
  direct SELECT privilege on it. Revoking SELECT hides the table from GraphQL
  while PostgREST (REST API) continues to enforce access through RLS policies,
  which are unaffected by column/table grants.

  ## Changes
  - Revoke SELECT on blocks, bug_reports, matches, messages, profiles, reports
    from the authenticated role
  - Revoke SELECT on profiles from the anon role
  - All other grants (INSERT, UPDATE, DELETE) are left intact
  - RLS policies remain unchanged and continue to govern actual row access
    via the REST/PostgREST API

  ## Storage
  - The broad "Public can view profile photos" SELECT policy was already
    removed; no further change needed there.
*/

-- Hide tables from GraphQL schema for authenticated users
REVOKE SELECT ON TABLE public.blocks      FROM authenticated;
REVOKE SELECT ON TABLE public.bug_reports FROM authenticated;
REVOKE SELECT ON TABLE public.matches     FROM authenticated;
REVOKE SELECT ON TABLE public.messages    FROM authenticated;
REVOKE SELECT ON TABLE public.profiles    FROM authenticated;
REVOKE SELECT ON TABLE public.reports     FROM authenticated;

-- Hide profiles from GraphQL schema for anonymous users
REVOKE SELECT ON TABLE public.profiles FROM anon;

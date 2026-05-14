/*
  # Revoke GraphQL Schema Visibility for Sensitive Tables

  ## Summary
  Revokes the broad table-level SELECT grant from the `authenticated` role on
  sensitive tables. This hides them from the GraphQL schema introspection while
  keeping all existing RLS policies intact — the app uses the Supabase JS client
  with row-level security, not GraphQL, so no functionality is affected.

  ## Tables Modified
  - `public.blocks` — user block relationships
  - `public.bug_reports` — internal bug submissions
  - `public.matches` — match/like records
  - `public.messages` — private messages
  - `public.profiles` — user profile data
  - `public.reports` — user reports

  ## What Changes
  - Revokes `SELECT` on each table from the `authenticated` role
  - RLS policies remain fully in place and continue to govern data access
  - The Supabase JS client uses the PostgREST API (not GraphQL), so app
    functionality is unaffected

  ## Security Impact
  Tables will no longer appear in GraphQL schema introspection for signed-in
  users, reducing the attack surface for schema enumeration.
*/

REVOKE SELECT ON public.blocks FROM authenticated;
REVOKE SELECT ON public.bug_reports FROM authenticated;
REVOKE SELECT ON public.matches FROM authenticated;
REVOKE SELECT ON public.messages FROM authenticated;
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.reports FROM authenticated;

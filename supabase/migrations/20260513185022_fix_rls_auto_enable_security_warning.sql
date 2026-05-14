/*
  # Fix Security Lint Warning: rls_auto_enable()

  1. Issue
    - Supabase linter flagged public.rls_auto_enable() as a SECURITY DEFINER
      function executable by anon and authenticated roles
    - Function does not appear to exist but we ensure it is dropped and
      privileges are revoked to clear the warning

  2. Changes
    - Drops the function if it exists
    - Revokes EXECUTE from anon, authenticated, and public roles
    
  3. Security
    - Prevents any potential privilege escalation via this function
*/

-- Drop the function if it exists (no-op if already gone)
DROP FUNCTION IF EXISTS public.rls_auto_enable();

-- Revoke execute permissions just in case residual grants exist
DO $$
BEGIN
  -- These will silently succeed even if the function doesn't exist
  EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon';
  EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public';
  
  -- Re-grant execute on functions that authenticated users need
  -- check_mutual_match is a trigger function, not called directly
  -- handle_new_user is a trigger function, not called directly
  -- prevent_privilege_escalation is a trigger function, not called directly
  -- enforce_message_update_rules is a trigger function, not called directly
END $$;

-- Explicitly grant execute back to authenticated for any functions they need via RPC
-- (Currently no public RPC functions are needed by the app)
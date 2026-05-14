/*
  # Fix handle_new_user() execute permission

  1. Issue
    - The previous migration (fix_rls_auto_enable_security_warning) ran
      REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public
    - This removed the default PUBLIC execute grant from handle_new_user()
    - supabase_auth_admin (GoTrue's role) can no longer execute the trigger
      function when inserting into auth.users
    - Result: all new signups and anonymous sign-ins fail

  2. Changes
    - Grants EXECUTE on handle_new_user() to supabase_auth_admin so the
      on_auth_user_created trigger works again
    - Also grants to authenticated for completeness

  3. Security
    - handle_new_user is SECURITY DEFINER owned by postgres with
      search_path=public, so it safely bypasses RLS for profile creation
    - Only supabase_auth_admin triggers it (via auth.users INSERT)
    - Not callable via PostgREST RPC since it has no PUBLIC/anon grant
*/

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
/*
  # Create profile automatically via trigger on auth.users insert

  ## Problem
  The client-side signUp flow calls supabase.auth.signUp() then immediately
  tries to INSERT into public.profiles using the JS client. There is a race
  condition: the Supabase JS client may not have applied the new session JWT
  before the INSERT runs, causing it to execute as the anon role which lacks
  INSERT permission on profiles.

  ## Solution
  Use a SECURITY DEFINER trigger function that automatically creates a profile
  row whenever a new user is inserted into auth.users. This runs server-side
  with elevated privileges, eliminating the client-side race condition entirely.

  The client-side signUp code can then be simplified to just call auth.signUp()
  and let the trigger handle profile creation.

  ## Notes
  - The trigger uses SECURITY DEFINER so it runs as the postgres role
  - Default values match what the client was previously inserting
  - The function uses ON CONFLICT DO NOTHING to be safe if called multiple times
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    age,
    avatar_url,
    verified,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'age')::integer, 18),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop'
    ),
    true,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

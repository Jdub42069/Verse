/*
  # Support anonymous auth in profile creation trigger

  ## Changes
  Anonymous users created via supabase.auth.signInAnonymously() have NULL email.
  Update handle_new_user() to provide a placeholder email so the NOT NULL
  constraint on profiles.email is not violated.

  ## Notes
  - No schema change needed; only the trigger function body is updated.
  - Behavior for normal signups is unchanged.
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
    COALESCE(NEW.email, 'guest-' || NEW.id::text || '@anonymous.local'),
    COALESCE(NEW.raw_user_meta_data->>'name', 'Guest'),
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

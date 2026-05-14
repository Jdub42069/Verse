/*
  # Update Profile Policies for Email Field

  Updates the profile INSERT policy to allow setting email on signup.
  
  ## Changes
  - Updates INSERT policy to allow email field to be set
*/

-- Drop and recreate the insert policy to include email
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

/*
  # Add profile_photos array to profiles

  1. Changes
    - Adds `profile_photos` text[] column to store up to 3 photo URLs per profile
    - Defaults to empty array
    - Existing avatar_url remains for backwards compatibility

  2. Storage
    - Creates profile-photos storage bucket policy notes (bucket created via dashboard/API)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_photos'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photos text[] DEFAULT '{}';
  END IF;
END $$;

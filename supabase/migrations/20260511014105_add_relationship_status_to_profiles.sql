/*
  # Add relationship_status to profiles

  1. Changes
    - Adds `relationship_status` text column to profiles table
    - Allowed values: 'Single', 'Open Relationship', 'Married', 'Not Looking'
    - Nullable — users are not required to set it
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'relationship_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN relationship_status text DEFAULT NULL;
  END IF;
END $$;

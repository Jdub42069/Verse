/*
  # Add looking_for field to profiles

  1. Changes
    - `profiles` table: adds `looking_for` (text, nullable) — a short one-liner
      describing what the user is looking for, shown directly on discovery cards.

  2. Notes
    - No RLS changes required; existing policies already cover all profile columns.
    - No default value needed — null means the field is simply not shown on cards.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'looking_for'
  ) THEN
    ALTER TABLE profiles ADD COLUMN looking_for text;
  END IF;
END $$;

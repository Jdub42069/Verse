/*
  # Add Sexual Health Fields to Profiles

  Adds optional sexual health disclosure fields to the profiles table.

  ## New Columns
  - `hiv_status` (text, nullable) — 'negative' or 'positive', user-reported
  - `on_prep` (boolean, nullable) — whether the user is on PrEP
  - `no_stis` (boolean, nullable) — user self-reports no STIs
  - `last_tested_at` (date, nullable) — date of last sexual health check

  ## Notes
  - All fields are nullable so disclosure is fully optional
  - hiv_status is constrained to allowed values only
  - Existing RLS update policy already covers these columns (users can update own profile)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hiv_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN hiv_status text
      CHECK (hiv_status IN ('negative', 'positive'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'on_prep'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN on_prep boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'no_stis'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN no_stis boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_tested_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_tested_at date;
  END IF;
END $$;

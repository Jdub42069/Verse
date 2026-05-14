/*
  # Add 'undetectable' to hiv_status allowed values

  Updates the CHECK constraint on profiles.hiv_status to allow the value
  'undetectable' (U=U: Undetectable = Untransmittable), in addition to
  'negative' and 'positive'.
*/

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_hiv_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_hiv_status_check
  CHECK (hiv_status IN ('negative', 'positive', 'undetectable'));

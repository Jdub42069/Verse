/*
  # Add Admin Photo Verification System

  ## Changes
  This migration adds admin functionality for moderating and verifying profile pictures.

  1. New Columns on profiles table
    - photo_verified (boolean): Whether the profile photo has been verified by admin
    - photo_verification_status (text): Status of photo verification (pending, approved, rejected)
    - photo_rejection_reason (text): Reason for rejection if applicable
    - photo_verified_at (timestamptz): When the photo was verified
    - photo_verified_by (uuid): Admin who verified the photo
    - is_admin (boolean): Whether the user is an admin/moderator

  2. New Table: photo_verification_log
    - id (uuid): Unique identifier
    - profile_id (uuid): Profile being verified
    - admin_id (uuid): Admin performing the action
    - action (text): Action taken (approved, rejected)
    - reason (text): Reason for rejection if applicable
    - previous_status (text): Previous verification status
    - new_status (text): New verification status
    - created_at (timestamptz): When the action was taken

  3. Security
    - Enable RLS on photo_verification_log
    - Only admins can view verification logs
    - Only admins can update photo verification status

  4. Indexes
    - Index on photo_verification_status for filtering
    - Index on is_admin for quick admin lookups
    - Index on photo_verification_log profile_id and admin_id
*/

-- Add admin and photo verification columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_verification_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_verification_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_rejection_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_verified_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint for photo_verification_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_photo_verification_status_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_photo_verification_status_check 
    CHECK (photo_verification_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Create photo verification log table
CREATE TABLE IF NOT EXISTS photo_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  reason text,
  previous_status text,
  new_status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT photo_verification_log_action_check CHECK (action IN ('approved', 'rejected', 'reset'))
);

-- Enable RLS
ALTER TABLE photo_verification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photo_verification_log
CREATE POLICY "Admins can view verification logs"
  ON photo_verification_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert verification logs"
  ON photo_verification_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
    AND auth.uid() = admin_id
  );

-- Update existing profiles RLS to allow admins to update photo verification
CREATE POLICY "Admins can update photo verification status"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.is_admin = true
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_photo_verification_status ON profiles(photo_verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_photo_verification_log_profile_id ON photo_verification_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_photo_verification_log_admin_id ON photo_verification_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_photo_verification_log_created_at ON photo_verification_log(created_at DESC);

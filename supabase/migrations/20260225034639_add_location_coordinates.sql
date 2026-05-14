/*
  # Add Location Coordinates to Profiles

  1. Changes
    - Add `latitude` column (numeric) to store latitude coordinates
    - Add `longitude` column (numeric) to store longitude coordinates
    - Add `location_updated_at` column (timestamptz) to track when location was last updated
    
  2. Purpose
    - Enable automatic location detection on mobile devices
    - Support distance-based matching and filtering
    - Track location freshness for better user experience
    
  3. Notes
    - Latitude range: -90 to 90 degrees
    - Longitude range: -180 to 180 degrees
    - Columns are nullable to allow users without location data
    - Existing `location` text field remains for city/state display
*/

DO $$
BEGIN
  -- Add latitude column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE profiles ADD COLUMN latitude numeric(10, 7);
    COMMENT ON COLUMN profiles.latitude IS 'Latitude coordinate (-90 to 90)';
  END IF;

  -- Add longitude column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE profiles ADD COLUMN longitude numeric(10, 7);
    COMMENT ON COLUMN profiles.longitude IS 'Longitude coordinate (-180 to 180)';
  END IF;

  -- Add location_updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location_updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location_updated_at timestamptz;
    COMMENT ON COLUMN profiles.location_updated_at IS 'Timestamp of last location update';
  END IF;
END $$;

-- Add constraints for valid coordinate ranges
DO $$
BEGIN
  -- Add latitude constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'valid_latitude'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT valid_latitude 
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;

  -- Add longitude constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'valid_longitude'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT valid_longitude 
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;
END $$;
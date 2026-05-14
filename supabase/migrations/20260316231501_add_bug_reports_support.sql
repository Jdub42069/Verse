/*
  # Add Bug Reports Support

  ## Changes
  This migration extends the reports system to support both user reports and bug reports.

  1. New Table: bug_reports
    - id (uuid, primary key): Unique identifier for the bug report
    - reporter_id (uuid, foreign key): User who reported the bug
    - category (text): Type of bug (UI Issue, Crash, Performance, Feature Request, etc.)
    - description (text): Detailed description of the bug
    - device_info (jsonb): Device and platform information
    - status (text): Status of the bug report (pending, under_review, resolved, wont_fix)
    - created_at (timestamptz): When the report was created
    - resolved_at (timestamptz): When the bug was resolved

  2. Security
    - Enable RLS on bug_reports table
    - Users can insert their own bug reports
    - Users can view their own bug reports
    - Only authenticated users can submit bug reports

  3. Indexes
    - Index on reporter_id for efficient lookups
    - Index on status for filtering bug reports by status
    - Index on created_at for sorting by date
*/

-- Create bug_reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  device_info jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT bug_reports_category_check CHECK (category IN ('UI Issue', 'Crash', 'Performance', 'Feature Request', 'Login/Auth', 'Messages', 'Matching', 'Profile', 'Other')),
  CONSTRAINT bug_reports_status_check CHECK (status IN ('pending', 'under_review', 'resolved', 'wont_fix'))
);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert own bug reports"
  ON bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own bug reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter_id ON bug_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);

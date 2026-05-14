/*
  # Restore Row Level Security Policies

  This migration restores all RLS policies for the dating app after project restoration.

  ## Tables Covered
  1. profiles - User profile data
  2. messages - Private messages between users
  3. matches - User connections and likes
  4. blocks - User blocking system
  5. reports - User reporting system
  6. audit_logs - System audit trail

  ## Security Model
  - All policies enforce authentication
  - Users can only access their own data or data they're authorized to see
  - Blocking is enforced at the query level
  - Reports are restricted to reporters and admins
*/

-- Drop existing policies if any
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view active unblocked profiles" ON profiles;
  
  DROP POLICY IF EXISTS "Users can view their sent messages" ON messages;
  DROP POLICY IF EXISTS "Users can view their received messages" ON messages;
  DROP POLICY IF EXISTS "Users can insert messages" ON messages;
  DROP POLICY IF EXISTS "Users can update own messages" ON messages;
  DROP POLICY IF EXISTS "Users can delete their messages" ON messages;
  
  DROP POLICY IF EXISTS "Users can view their matches" ON matches;
  DROP POLICY IF EXISTS "Users can create matches" ON matches;
  DROP POLICY IF EXISTS "Users can update their match status" ON matches;
  
  DROP POLICY IF EXISTS "Users can view their blocks" ON blocks;
  DROP POLICY IF EXISTS "Users can create blocks" ON blocks;
  DROP POLICY IF EXISTS "Users can delete their blocks" ON blocks;
  
  DROP POLICY IF EXISTS "Users can view their reports" ON reports;
  DROP POLICY IF EXISTS "Users can create reports" ON reports;
  
  DROP POLICY IF EXISTS "Users can view their audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
END $$;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view active unblocked profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND id != auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id)
      OR (blocker_id = profiles.id AND blocked_id = auth.uid())
    )
  );

-- Messages Policies
CREATE POLICY "Users can view their sent messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() 
    AND deleted_by_sender = false
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = auth.uid() AND blocked_id = receiver_id)
      OR (blocker_id = receiver_id AND blocked_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their received messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    receiver_id = auth.uid() 
    AND deleted_by_receiver = false
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = auth.uid() AND blocked_id = sender_id)
      OR (blocker_id = sender_id AND blocked_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = auth.uid() AND blocked_id = receiver_id)
      OR (blocker_id = receiver_id AND blocked_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can delete their messages"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Matches Policies
CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  TO authenticated
  USING (
    (user_a_id = auth.uid() OR user_b_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = auth.uid() AND (blocked_id = user_a_id OR blocked_id = user_b_id))
      OR ((blocker_id = user_a_id OR blocker_id = user_b_id) AND blocked_id = auth.uid())
    )
  );

CREATE POLICY "Users can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (
    user_a_id = auth.uid() OR user_b_id = auth.uid()
  );

CREATE POLICY "Users can update their match status"
  ON matches FOR UPDATE
  TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid())
  WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Blocks Policies
CREATE POLICY "Users can view their blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid() AND blocked_id != auth.uid());

CREATE POLICY "Users can delete their blocks"
  ON blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Reports Policies
CREATE POLICY "Users can view their reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() 
    AND reported_id != auth.uid()
  );

-- Audit Logs Policies
CREATE POLICY "Users can view their audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to automatically mark messages as matched
CREATE OR REPLACE FUNCTION check_mutual_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_a_liked = true AND NEW.user_b_liked = true AND NEW.is_mutual_match = false THEN
    NEW.is_mutual_match := true;
    NEW.matched_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mutual matches
DROP TRIGGER IF EXISTS trigger_check_mutual_match ON matches;
CREATE TRIGGER trigger_check_mutual_match
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION check_mutual_match();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_mutual ON matches(is_mutual_match) WHERE is_mutual_match = true;
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

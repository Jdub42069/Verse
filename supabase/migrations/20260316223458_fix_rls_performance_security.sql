/*
  # Fix RLS Performance and Security Issues

  This migration addresses critical security and performance issues:

  ## 1. RLS Performance Optimization
  Wraps all auth.uid() calls in SELECT subqueries to prevent re-evaluation for each row.
  This significantly improves query performance at scale.

  ## 2. Remove Duplicate Policies
  Removes duplicate RLS policies that were created in multiple migrations.

  ## 3. Remove Duplicate Indexes
  Drops duplicate indexes that serve the same purpose.

  ## 4. Remove Unused Indexes
  Drops unused indexes to reduce storage overhead.

  ## 5. Fix Function Security
  Updates check_mutual_match() function with stable search_path.

  ## 6. Fix Audit Logs Policy
  Makes the audit logs insert policy more restrictive.
*/

-- Drop ALL Existing Policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view active unblocked profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can view verified active profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can view their sent messages" ON messages;
  DROP POLICY IF EXISTS "Users can view their received messages" ON messages;
  DROP POLICY IF EXISTS "Users can view messages sent to them" ON messages;
  DROP POLICY IF EXISTS "Users can insert messages" ON messages;
  DROP POLICY IF EXISTS "Users can update own messages" ON messages;
  DROP POLICY IF EXISTS "Users can mark messages as read" ON messages;
  DROP POLICY IF EXISTS "Users can delete their messages" ON messages;
  DROP POLICY IF EXISTS "Users can soft-delete their messages" ON messages;
  DROP POLICY IF EXISTS "Users can view their matches" ON matches;
  DROP POLICY IF EXISTS "Users can view their own matches" ON matches;
  DROP POLICY IF EXISTS "Users can create matches" ON matches;
  DROP POLICY IF EXISTS "Users can insert match entries" ON matches;
  DROP POLICY IF EXISTS "Users can update their match status" ON matches;
  DROP POLICY IF EXISTS "Users can update their own like status" ON matches;
  DROP POLICY IF EXISTS "Users can view their blocks" ON blocks;
  DROP POLICY IF EXISTS "Users can view their own blocks" ON blocks;
  DROP POLICY IF EXISTS "Users can create blocks" ON blocks;
  DROP POLICY IF EXISTS "Users can delete their blocks" ON blocks;
  DROP POLICY IF EXISTS "Users can delete their own blocks" ON blocks;
  DROP POLICY IF EXISTS "Users can view their reports" ON reports;
  DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
  DROP POLICY IF EXISTS "Users can create reports" ON reports;
  DROP POLICY IF EXISTS "Users can view their audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "Admin only can view audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
END $$;

-- Create Optimized Profiles Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can view active unblocked profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    is_active = true AND id != (select auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = (select auth.uid()) AND blocked_id = profiles.id)
      OR (blocker_id = profiles.id AND blocked_id = (select auth.uid()))
    )
  );

-- Create Optimized Messages Policies
CREATE POLICY "Users can view their sent messages"
  ON messages FOR SELECT TO authenticated
  USING (
    sender_id = (select auth.uid()) AND deleted_by_sender = false
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = (select auth.uid()) AND blocked_id = receiver_id)
      OR (blocker_id = receiver_id AND blocked_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can view their received messages"
  ON messages FOR SELECT TO authenticated
  USING (
    receiver_id = (select auth.uid()) AND deleted_by_receiver = false
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = (select auth.uid()) AND blocked_id = sender_id)
      OR (blocker_id = sender_id AND blocked_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = (select auth.uid()) AND blocked_id = receiver_id)
      OR (blocker_id = receiver_id AND blocked_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE TO authenticated
  USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

CREATE POLICY "Users can delete their messages"
  ON messages FOR DELETE TO authenticated
  USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

-- Create Optimized Matches Policies
CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT TO authenticated
  USING (
    (user_a_id = (select auth.uid()) OR user_b_id = (select auth.uid()))
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = (select auth.uid()) AND (blocked_id = user_a_id OR blocked_id = user_b_id))
      OR ((blocker_id = user_a_id OR blocker_id = user_b_id) AND blocked_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can create matches"
  ON matches FOR INSERT TO authenticated
  WITH CHECK (user_a_id = (select auth.uid()) OR user_b_id = (select auth.uid()));

CREATE POLICY "Users can update their match status"
  ON matches FOR UPDATE TO authenticated
  USING (user_a_id = (select auth.uid()) OR user_b_id = (select auth.uid()))
  WITH CHECK (user_a_id = (select auth.uid()) OR user_b_id = (select auth.uid()));

-- Create Optimized Blocks Policies
CREATE POLICY "Users can view their blocks"
  ON blocks FOR SELECT TO authenticated
  USING (blocker_id = (select auth.uid()));

CREATE POLICY "Users can create blocks"
  ON blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = (select auth.uid()) AND blocked_id != (select auth.uid()));

CREATE POLICY "Users can delete their blocks"
  ON blocks FOR DELETE TO authenticated
  USING (blocker_id = (select auth.uid()));

-- Create Optimized Reports Policies
CREATE POLICY "Users can view their reports"
  ON reports FOR SELECT TO authenticated
  USING (reporter_id = (select auth.uid()));

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()) AND reported_id != (select auth.uid()));

-- Create Optimized Audit Logs Policies
CREATE POLICY "Users can view their audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Remove Duplicate Indexes
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_blocks_blocked_id;
DROP INDEX IF EXISTS idx_blocks_blocker_id;
DROP INDEX IF EXISTS idx_reports_reporter_id;

-- Remove Unused Indexes
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_verified;
DROP INDEX IF EXISTS idx_messages_receiver_id;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_read;
DROP INDEX IF EXISTS idx_matches_user_a_id;
DROP INDEX IF EXISTS idx_matches_user_b_id;
DROP INDEX IF EXISTS idx_matches_is_mutual;
DROP INDEX IF EXISTS idx_reports_reported_id;
DROP INDEX IF EXISTS idx_audit_logs_action;

-- Fix Function Security
CREATE OR REPLACE FUNCTION check_mutual_match()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_a_liked = true AND NEW.user_b_liked = true AND NEW.is_mutual_match = false THEN
    NEW.is_mutual_match := true;
    NEW.matched_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

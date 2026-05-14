/*
  # Fix Indexes and Consolidate RLS Policies

  This migration addresses remaining security and performance issues:

  ## 1. Add Missing Foreign Key Indexes
  Creates indexes for foreign keys that were missing covering indexes:
  - matches.user_b_id (for matches_user_b_id_fkey)
  - messages.receiver_id (for messages_receiver_id_fkey)
  - reports.reported_id (for reports_reported_id_fkey)

  ## 2. Remove Unused Indexes
  Drops indexes that are not being used by queries:
  - idx_profiles_is_active
  - idx_messages_created_at
  - idx_blocks_blocker
  - idx_blocks_blocked
  - idx_reports_reporter
  - idx_reports_status
  - idx_profiles_location
  - idx_audit_logs_user
  - idx_profiles_last_seen
  - idx_messages_sender_receiver
  - idx_matches_users
  - idx_matches_mutual
  - idx_audit_logs_created

  ## 3. Consolidate Multiple Permissive Policies
  Combines multiple SELECT policies into single policies to avoid confusion:
  - profiles: Merges "view own" and "view active unblocked" into one policy
  - messages: Merges "view sent" and "view received" into one policy

  ## Security Changes
  - Better query performance with proper foreign key indexes
  - Reduced storage overhead from unused indexes
  - Clearer security model with consolidated policies
*/

-- ============================================================================
-- STEP 1: Add Missing Foreign Key Indexes
-- ============================================================================

-- Index for matches.user_b_id foreign key
CREATE INDEX IF NOT EXISTS idx_matches_user_b_id ON matches(user_b_id);

-- Index for messages.receiver_id foreign key
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);

-- Index for reports.reported_id foreign key
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON reports(reported_id);

-- ============================================================================
-- STEP 2: Remove Unused Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_profiles_is_active;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_blocks_blocker;
DROP INDEX IF EXISTS idx_blocks_blocked;
DROP INDEX IF EXISTS idx_reports_reporter;
DROP INDEX IF EXISTS idx_reports_status;
DROP INDEX IF EXISTS idx_profiles_location;
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_profiles_last_seen;
DROP INDEX IF EXISTS idx_messages_sender_receiver;
DROP INDEX IF EXISTS idx_matches_users;
DROP INDEX IF EXISTS idx_matches_mutual;
DROP INDEX IF EXISTS idx_audit_logs_created;

-- ============================================================================
-- STEP 3: Consolidate Multiple Permissive Policies
-- ============================================================================

-- Drop existing SELECT policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view active unblocked profiles" ON profiles;

-- Create consolidated profiles SELECT policy
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Can view own profile
    (select auth.uid()) = id
    OR
    -- Can view active unblocked profiles
    (
      is_active = true 
      AND id != (select auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM blocks 
        WHERE (blocker_id = (select auth.uid()) AND blocked_id = profiles.id)
        OR (blocker_id = profiles.id AND blocked_id = (select auth.uid()))
      )
    )
  );

-- Drop existing SELECT policies for messages
DROP POLICY IF EXISTS "Users can view their sent messages" ON messages;
DROP POLICY IF EXISTS "Users can view their received messages" ON messages;

-- Create consolidated messages SELECT policy
CREATE POLICY "Users can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    -- Can view sent messages (not deleted by sender)
    (
      sender_id = (select auth.uid()) 
      AND deleted_by_sender = false
      AND NOT EXISTS (
        SELECT 1 FROM blocks 
        WHERE (blocker_id = (select auth.uid()) AND blocked_id = receiver_id)
        OR (blocker_id = receiver_id AND blocked_id = (select auth.uid()))
      )
    )
    OR
    -- Can view received messages (not deleted by receiver)
    (
      receiver_id = (select auth.uid()) 
      AND deleted_by_receiver = false
      AND NOT EXISTS (
        SELECT 1 FROM blocks 
        WHERE (blocker_id = (select auth.uid()) AND blocked_id = sender_id)
        OR (blocker_id = sender_id AND blocked_id = (select auth.uid()))
      )
    )
  );

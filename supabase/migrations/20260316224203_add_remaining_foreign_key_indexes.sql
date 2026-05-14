/*
  # Add Remaining Foreign Key Indexes

  This migration adds indexes for foreign keys that were still missing covering indexes.

  ## New Indexes
  Creates indexes for the following foreign key columns:
  - audit_logs.user_id (for audit_logs_user_id_fkey)
  - blocks.blocked_id (for blocks_blocked_id_fkey)
  - messages.sender_id (for messages_sender_id_fkey)
  - reports.reporter_id (for reports_reporter_id_fkey)

  ## Performance Impact
  These indexes will significantly improve query performance for:
  - Looking up audit logs by user
  - Finding all blocks for a blocked user
  - Retrieving messages sent by a specific user
  - Finding reports submitted by a specific reporter

  ## Note on "Unused" Indexes
  The indexes created in the previous migration (idx_matches_user_b_id, idx_messages_receiver_id, 
  idx_reports_reported_id) show as unused because they haven't been utilized by queries yet. 
  These indexes are essential for foreign key performance and should remain in place.
*/

-- Index for audit_logs.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Index for blocks.blocked_id foreign key
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);

-- Index for messages.sender_id foreign key
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Index for reports.reporter_id foreign key
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);

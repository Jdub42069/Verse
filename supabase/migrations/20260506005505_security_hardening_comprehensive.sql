/*
  # Comprehensive Security Hardening

  ## Issues Fixed

  ### CRITICAL: Admin Privilege Escalation Prevention
  - Users could set `is_admin = true` on their own profile row via the generic
    "Users can update own profile" RLS policy, which had no column restrictions.
  - Fix: BEFORE UPDATE trigger that blocks non-admins from modifying is_admin,
    photo_verified, photo_verification_status, photo_verified_by, photo_verified_at.

  ### HIGH: Message Content Immutability
  - The UPDATE policy allowed both sender and receiver to modify any column,
    so a receiver could alter content of messages sent to them.
  - Fix: BEFORE UPDATE trigger that makes content immutable after insert and
    restricts each party to only their allowed mutable fields.

  ### HIGH: Matches INSERT Spoofing Prevention
  - INSERT WITH CHECK only required caller to appear as user_a OR user_b,
    so a user could create a row where user_a_id is someone else's ID.
  - Fix: user_a_id must equal auth.uid() on every INSERT (user_a is always
    the initiating party).

  ### MEDIUM: Message Content Length Limit
  - No server-side cap on message length allowed unbounded payloads.
  - Fix: CHECK constraint capping content at 1–2000 characters.
*/

-- ============================================================
-- 1. PREVENT PRIVILEGE ESCALATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only applies when a non-admin updates their own profile row
  IF OLD.id = (SELECT auth.uid()) AND NOT OLD.is_admin THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Permission denied: cannot modify is_admin';
    END IF;
    IF NEW.photo_verified IS DISTINCT FROM OLD.photo_verified THEN
      RAISE EXCEPTION 'Permission denied: cannot modify photo_verified';
    END IF;
    IF NEW.photo_verified_by IS DISTINCT FROM OLD.photo_verified_by THEN
      RAISE EXCEPTION 'Permission denied: cannot modify photo_verified_by';
    END IF;
    IF NEW.photo_verified_at IS DISTINCT FROM OLD.photo_verified_at THEN
      RAISE EXCEPTION 'Permission denied: cannot modify photo_verified_at';
    END IF;
    IF NEW.photo_verification_status IS DISTINCT FROM OLD.photo_verification_status THEN
      RAISE EXCEPTION 'Permission denied: cannot modify photo_verification_status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_no_privilege_escalation ON public.profiles;
CREATE TRIGGER enforce_no_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation();

-- ============================================================
-- 2. MESSAGE IMMUTABILITY TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_message_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id uuid := (SELECT auth.uid());
BEGIN
  -- Content must never change after creation
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    RAISE EXCEPTION 'Permission denied: message content is immutable';
  END IF;

  -- Sender/receiver parties are immutable
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id OR
     NEW.receiver_id IS DISTINCT FROM OLD.receiver_id THEN
    RAISE EXCEPTION 'Permission denied: message parties are immutable';
  END IF;

  -- Sender (non-self-message) may only change deleted_by_sender
  IF caller_id = OLD.sender_id AND caller_id != OLD.receiver_id THEN
    IF NEW.read IS DISTINCT FROM OLD.read OR
       NEW.deleted_by_receiver IS DISTINCT FROM OLD.deleted_by_receiver THEN
      RAISE EXCEPTION 'Permission denied: sender cannot modify receiver-only fields';
    END IF;
  END IF;

  -- Receiver (non-self-message) may only change read and deleted_by_receiver
  IF caller_id = OLD.receiver_id AND caller_id != OLD.sender_id THEN
    IF NEW.deleted_by_sender IS DISTINCT FROM OLD.deleted_by_sender THEN
      RAISE EXCEPTION 'Permission denied: receiver cannot modify sender-only fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_message_update_rules ON public.messages;
CREATE TRIGGER enforce_message_update_rules
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_update_rules();

-- ============================================================
-- 3. FIX MATCHES INSERT POLICY
--    user_a_id must be the caller — they are the initiating party.
-- ============================================================
DROP POLICY IF EXISTS "Users can create matches" ON public.matches;

CREATE POLICY "Users can create matches"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (
    user_a_id = (SELECT auth.uid())
    AND user_b_id != (SELECT auth.uid())
  );

-- ============================================================
-- 4. MESSAGE CONTENT LENGTH LIMIT
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_content_length_check'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_content_length_check
      CHECK (char_length(content) BETWEEN 1 AND 2000);
  END IF;
END $$;

-- Migration: 20260310000002_revert_event_checkin_rpc
-- Description: Adds a function to reverse the effects of process_event_checkin

CREATE OR REPLACE FUNCTION revert_event_checkin(p_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_profile_id uuid;
  v_status text;
  v_event_type text;
  v_mission_id uuid;
  v_points_awarded integer := 0;
  v_coins_awarded integer := 0;
BEGIN
  -- 1. Get registration info
  SELECT event_id, profile_id, status 
  INTO v_event_id, v_profile_id, v_status 
  FROM event_registrations 
  WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  IF v_status != 'checked_in' THEN
    RAISE EXCEPTION 'Registration is not checked in';
  END IF;

  -- 2. Get event info
  SELECT event_type, mission_id 
  INTO v_event_type, v_mission_id 
  FROM events 
  WHERE id = v_event_id;

  -- 3. Calculate and deduct points/coins
  -- Find the transactions created by the check-in (source_id = v_event_id, source = 'event_checkin')
  
  -- Revert Points
  SELECT amount INTO v_points_awarded
  FROM points_transactions
  WHERE profile_id = v_profile_id AND source = 'event_checkin' AND source_id = v_event_id;

  IF v_points_awarded IS NOT NULL AND v_points_awarded > 0 THEN
    -- Deduct from profile
    UPDATE profiles SET total_points = GREATEST(0, COALESCE(total_points, 0) - v_points_awarded) WHERE id = v_profile_id;
    -- Note: We could either insert a 'deduct' transaction or just delete the 'earn' one. 
    -- Deleting the earn transaction is cleaner for a true "revert" action to keep history clean.
    DELETE FROM points_transactions WHERE profile_id = v_profile_id AND source = 'event_checkin' AND source_id = v_event_id;
  END IF;

  -- Revert Coins
  SELECT amount INTO v_coins_awarded
  FROM coins_transactions
  WHERE profile_id = v_profile_id AND source = 'event_checkin' AND source_id = v_event_id;

  IF v_coins_awarded IS NOT NULL AND v_coins_awarded > 0 THEN
    -- Deduct from profile
    UPDATE profiles SET total_coins = GREATEST(0, COALESCE(total_coins, 0) - v_coins_awarded) WHERE id = v_profile_id;
    -- Delete the earn transaction
    DELETE FROM coins_transactions WHERE profile_id = v_profile_id AND source = 'event_checkin' AND source_id = v_event_id;
  END IF;

  -- 4. Revert Mission Status
  IF v_event_type = 'mission_event' AND v_mission_id IS NOT NULL THEN
    -- Remove the completion record for this mission
    DELETE FROM mission_completions 
    WHERE profile_id = v_profile_id AND mission_id = v_mission_id;
  END IF;

  -- 5. Update Registration Status back to 'registered'
  UPDATE event_registrations 
  SET status = 'registered', 
      checked_in_at = NULL,
      scanned_by = NULL
  WHERE id = p_registration_id;

END;
$$;

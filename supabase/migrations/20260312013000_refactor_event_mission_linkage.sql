-- Remove mission_id from events table
ALTER TABLE events DROP COLUMN IF EXISTS mission_id;

-- Update the process_event_checkin function to use the new linkage logic
CREATE OR REPLACE FUNCTION process_event_checkin(p_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_profile_id uuid;
  v_status text;
  v_event_type text;
  v_member_type text;
  v_tier_name text;
  v_points_reward integer := 0;
  v_coins_reward integer := 0;
  v_reward_id uuid;
  v_mission_record record;
BEGIN
  -- Get registration info
  SELECT event_id, profile_id, status 
  INTO v_event_id, v_profile_id, v_status 
  FROM event_registrations 
  WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  IF v_status = 'checked_in' THEN
    RAISE EXCEPTION 'Already checked in';
  END IF;

  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION 'Registration was cancelled';
  END IF;

  -- Get event info
  SELECT event_type 
  INTO v_event_type 
  FROM events 
  WHERE id = v_event_id;

  -- Get profile info
  SELECT member_type, tier 
  INTO v_member_type, v_tier_name
  FROM profiles 
  WHERE id = v_profile_id;

  -- Update status
  UPDATE event_registrations 
  SET status = 'checked_in', 
      checked_in_at = NOW() 
  WHERE id = p_registration_id;

  -- Find applicable reward (simplest matching logic: match tier & member_type if specified, else generic)
  SELECT id, points_reward, coins_reward
  INTO v_reward_id, v_points_reward, v_coins_reward
  FROM event_rewards
  WHERE event_id = v_event_id
    AND (tier_name = v_tier_name OR tier_name IS NULL OR tier_name = '')
    AND (member_type = v_member_type OR member_type IS NULL OR member_type = '')
  ORDER BY 
    (CASE WHEN tier_name = v_tier_name THEN 1 ELSE 0 END + 
     CASE WHEN member_type = v_member_type THEN 1 ELSE 0 END) DESC
  LIMIT 1;

  -- Give Rewards
  IF v_points_reward > 0 THEN
    UPDATE profiles SET total_points = COALESCE(total_points, 0) + v_points_reward WHERE id = v_profile_id;
    INSERT INTO points_transactions (profile_id, amount, transaction_type, source, description, source_id)
    VALUES (v_profile_id, v_points_reward, 'earn', 'event_checkin', 'Event Check-in Reward', v_event_id);
  END IF;

  IF v_coins_reward > 0 THEN
    UPDATE profiles SET total_coins = COALESCE(total_coins, 0) + v_coins_reward WHERE id = v_profile_id;
    INSERT INTO coins_transactions (profile_id, amount, transaction_type, source, description, source_id)
    VALUES (v_profile_id, v_coins_reward, 'earn', 'event_checkin', 'Event Check-in Reward', v_event_id);
  END IF;

  -- Mark Mission as complete if applicable
  IF v_event_type = 'mission_event' THEN
    -- Find all active check_in missions linked to this event
    FOR v_mission_record IN 
      SELECT id, points_reward, coins_reward
      FROM missions 
      WHERE is_active = true 
        AND mission_type = 'check_in' 
        AND requirements @> jsonb_build_object('linked_events', jsonb_build_array(v_event_id::text))
    LOOP
      -- Check if not already completed
      IF NOT EXISTS (SELECT 1 FROM mission_completions WHERE profile_id = v_profile_id AND mission_id = v_mission_record.id) THEN
        INSERT INTO mission_completions (profile_id, mission_id, status, points_earned, coins_earned)
        VALUES (v_profile_id, v_mission_record.id, 'approved', COALESCE(v_mission_record.points_reward, 0), COALESCE(v_mission_record.coins_reward, 0));
        
        -- Also reward the user for completing the mission itself
        IF COALESCE(v_mission_record.points_reward, 0) > 0 THEN
          UPDATE profiles SET total_points = COALESCE(total_points, 0) + v_mission_record.points_reward WHERE id = v_profile_id;
          INSERT INTO points_transactions (profile_id, amount, transaction_type, source, description, source_id)
          VALUES (v_profile_id, v_mission_record.points_reward, 'earn', 'mission_completion', 'Mission Completion Reward', v_mission_record.id);
        END IF;

        IF COALESCE(v_mission_record.coins_reward, 0) > 0 THEN
          UPDATE profiles SET total_coins = COALESCE(total_coins, 0) + v_mission_record.coins_reward WHERE id = v_profile_id;
          INSERT INTO coins_transactions (profile_id, amount, transaction_type, source, description, source_id)
          VALUES (v_profile_id, v_mission_record.coins_reward, 'earn', 'mission_completion', 'Mission Completion Reward', v_mission_record.id);
        END IF;

      END IF;
    END LOOP;
  END IF;

END;
$$;

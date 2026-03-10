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
  v_mission_id uuid;
  v_member_type text;
  v_tier_name text;
  v_points_reward integer := 0;
  v_coins_reward integer := 0;
  v_reward_id uuid;
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
  SELECT event_type, mission_id 
  INTO v_event_type, v_mission_id 
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
  -- Order by specificity: 
  -- 1) both matched
  -- 2) tier matched, member_type null
  -- 3) member_type matched, tier null
  -- 4) both null
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
  IF v_event_type = 'mission_event' AND v_mission_id IS NOT NULL THEN
    -- Check if not already completed
    IF NOT EXISTS (SELECT 1 FROM mission_progress WHERE profile_id = v_profile_id AND mission_id = v_mission_id) THEN
      INSERT INTO mission_progress (profile_id, mission_id, status, current_value, target_value)
      VALUES (v_profile_id, v_mission_id, 'completed', 1, 1);
    END IF;
  END IF;

END;
$$;

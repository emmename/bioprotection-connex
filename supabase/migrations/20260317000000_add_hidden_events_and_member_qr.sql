-- Add is_visible column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Create RPC function for member-based event check-in (for hidden events)
-- This creates a registration AND checks in the member in one step
CREATE OR REPLACE FUNCTION process_member_event_checkin(
  p_profile_id uuid, 
  p_event_id uuid, 
  p_scanned_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_type text;
  v_member_type text;
  v_tier_name text;
  v_points_reward integer := 0;
  v_coins_reward integer := 0;
  v_reward_id uuid;
  v_registration_id uuid;
  v_mission_record record;
  v_profile_name text;
BEGIN
  -- Verify the profile exists
  SELECT member_type, tier, first_name || ' ' || last_name
  INTO v_member_type, v_tier_name, v_profile_name
  FROM public.profiles
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Verify the event exists and is active
  SELECT event_type
  INTO v_event_type
  FROM public.events
  WHERE id = p_event_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or not active';
  END IF;

  -- Check if member already checked in for this event
  IF EXISTS (
    SELECT 1 FROM public.event_registrations 
    WHERE event_id = p_event_id 
      AND profile_id = p_profile_id 
      AND status = 'checked_in'
  ) THEN
    RAISE EXCEPTION 'Already checked in';
  END IF;

  -- Check if there's an existing registration (registered but not checked in)
  SELECT id INTO v_registration_id
  FROM public.event_registrations
  WHERE event_id = p_event_id 
    AND profile_id = p_profile_id
    AND status = 'registered';

  IF FOUND THEN
    -- Update existing registration to checked_in
    UPDATE public.event_registrations
    SET status = 'checked_in',
        checked_in_at = NOW(),
        scanned_by = p_scanned_by
    WHERE id = v_registration_id;
  ELSE
    -- Create new registration + check-in in one step
    INSERT INTO public.event_registrations (event_id, profile_id, status, checked_in_at, scanned_by)
    VALUES (p_event_id, p_profile_id, 'checked_in', NOW(), p_scanned_by)
    RETURNING id INTO v_registration_id;
  END IF;

  -- Find applicable reward
  SELECT id, points_reward, coins_reward
  INTO v_reward_id, v_points_reward, v_coins_reward
  FROM public.event_rewards
  WHERE event_id = p_event_id
    AND (tier_name = v_tier_name OR tier_name IS NULL OR tier_name = '')
    AND (member_type = v_member_type OR member_type IS NULL OR member_type = '')
  ORDER BY 
    (CASE WHEN tier_name = v_tier_name THEN 1 ELSE 0 END + 
     CASE WHEN member_type = v_member_type THEN 1 ELSE 0 END) DESC
  LIMIT 1;

  -- Give Rewards
  IF v_points_reward > 0 THEN
    UPDATE public.profiles SET total_points = COALESCE(total_points, 0) + v_points_reward WHERE id = p_profile_id;
    INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description, source_id)
    VALUES (p_profile_id, v_points_reward, 'earn', 'event_checkin', 'Event Check-in Reward', p_event_id);
  END IF;

  IF v_coins_reward > 0 THEN
    UPDATE public.profiles SET total_coins = COALESCE(total_coins, 0) + v_coins_reward WHERE id = p_profile_id;
    INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description, source_id)
    VALUES (p_profile_id, v_coins_reward, 'earn', 'event_checkin', 'Event Check-in Reward', p_event_id);
  END IF;

  -- Mark Mission as complete if applicable
  IF v_event_type = 'mission_event' THEN
    FOR v_mission_record IN 
      SELECT id, points_reward, coins_reward
      FROM public.missions 
      WHERE is_active = true 
        AND (mission_type = 'location_visit' OR mission_type = 'special')
        AND requirements @> jsonb_build_object('linked_events', jsonb_build_array(p_event_id::text))
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.mission_completions WHERE profile_id = p_profile_id AND mission_id = v_mission_record.id) THEN
        INSERT INTO public.mission_completions (profile_id, mission_id, status, points_earned, coins_earned)
        VALUES (p_profile_id, v_mission_record.id, 'approved', COALESCE(v_mission_record.points_reward, 0), COALESCE(v_mission_record.coins_reward, 0));
        
        IF COALESCE(v_mission_record.points_reward, 0) > 0 THEN
          UPDATE public.profiles SET total_points = COALESCE(total_points, 0) + v_mission_record.points_reward WHERE id = p_profile_id;
          INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description, source_id)
          VALUES (p_profile_id, v_mission_record.points_reward, 'earn', 'mission_completion', 'Mission Completion Reward', v_mission_record.id);
        END IF;

        IF COALESCE(v_mission_record.coins_reward, 0) > 0 THEN
          UPDATE public.profiles SET total_coins = COALESCE(total_coins, 0) + v_mission_record.coins_reward WHERE id = p_profile_id;
          INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description, source_id)
          VALUES (p_profile_id, v_mission_record.coins_reward, 'earn', 'mission_completion', 'Mission Completion Reward', v_mission_record.id);
        END IF;
      END IF;
    END LOOP;
  END IF;

END;
$$;

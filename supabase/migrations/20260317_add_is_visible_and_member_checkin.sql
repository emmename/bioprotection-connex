-- ========================================
-- Add is_visible column to events
-- ========================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.events.is_visible IS
  'When false, members cannot see this event in the events list. Staff can still check members in by scanning their personal QR.';

-- ========================================
-- RPC: process_member_event_checkin
-- Staff scans a member QR, picks an event, and this
-- creates the registration + check-in + rewards in one call.
-- ========================================
CREATE OR REPLACE FUNCTION public.process_member_event_checkin(
  p_profile_id UUID,
  p_event_id UUID,
  p_scanned_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id UUID;
  v_event RECORD;
  v_profile RECORD;
  v_reward RECORD;
BEGIN
  -- 1) Validate event exists and is active
  SELECT * INTO v_event
    FROM public.events
   WHERE id = p_event_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or not active';
  END IF;

  -- 2) Validate profile exists
  SELECT * INTO v_profile
    FROM public.profiles
   WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- 3) Upsert registration (insert if not exists, otherwise reuse)
  INSERT INTO public.event_registrations (event_id, profile_id, status, checked_in_at)
  VALUES (p_event_id, p_profile_id, 'checked_in', now())
  ON CONFLICT (event_id, profile_id) DO UPDATE
    SET status = 'checked_in',
        checked_in_at = COALESCE(event_registrations.checked_in_at, now())
  RETURNING id INTO v_reg_id;

  -- 4) Distribute rewards (if any matching event_rewards exist)
  FOR v_reward IN
    SELECT * FROM public.event_rewards
     WHERE event_id = p_event_id
       AND (
         member_type IS NULL
         OR member_type = v_profile.member_type
       )
       AND (
         tier_name IS NULL
         OR tier_name = v_profile.tier
       )
  LOOP
    -- Add points
    IF v_reward.points_reward > 0 THEN
      UPDATE public.profiles
         SET points = COALESCE(points, 0) + v_reward.points_reward,
             total_points = COALESCE(total_points, 0) + v_reward.points_reward
       WHERE id = p_profile_id;

      INSERT INTO public.point_transactions (profile_id, points, type, description)
      VALUES (p_profile_id, v_reward.points_reward, 'earn',
              'Event check-in reward: ' || v_event.title);
    END IF;

    -- Add coins
    IF v_reward.coins_reward > 0 THEN
      UPDATE public.profiles
         SET coins = COALESCE(coins, 0) + v_reward.coins_reward
       WHERE id = p_profile_id;

      INSERT INTO public.coin_transactions (profile_id, coins, type, description)
      VALUES (p_profile_id, v_reward.coins_reward, 'earn',
              'Event check-in reward: ' || v_event.title);
    END IF;
  END LOOP;
END;
$$;

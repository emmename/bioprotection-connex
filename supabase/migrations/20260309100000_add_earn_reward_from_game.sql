-- Create function for players to earn rewards (coins or points) from games

CREATE OR REPLACE FUNCTION public.earn_reward_from_game(
  p_profile_id uuid,
  p_reward_type text, -- 'coins' or 'points'
  p_amount integer,
  p_game_type text,
  p_description text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check that the caller owns this profile
  IF (SELECT user_id FROM profiles WHERE id = p_profile_id) != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You can only earn rewards for your own profile';
  END IF;

  -- Verify amount is positive to prevent cheating with negative amounts (which would be deducting)
  IF p_amount <= 0 THEN
    RETURN; -- Do nothing if no reward amount
  END IF;

  IF p_reward_type = 'coins' THEN
    -- Add coins to profile
    UPDATE public.profiles
    SET total_coins = total_coins + p_amount
    WHERE id = p_profile_id;

    -- Insert transaction record
    INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description)
    VALUES (p_profile_id, p_amount, 'earn', 'game', COALESCE(p_description, 'ได้รับรางวัลจากเกม ' || p_game_type));
    
  ELSIF p_reward_type = 'points' THEN
    -- Add points to profile
    UPDATE public.profiles
    SET total_points = total_points + p_amount
    WHERE id = p_profile_id;

    -- Insert transaction record
    INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
    VALUES (p_profile_id, p_amount, 'earn', 'game', COALESCE(p_description, 'ได้รับรางวัลจากเกม ' || p_game_type));
    
  ELSE
    RAISE EXCEPTION 'Invalid reward type. Must be "coins" or "points".';
  END IF;
  
END;
$$;

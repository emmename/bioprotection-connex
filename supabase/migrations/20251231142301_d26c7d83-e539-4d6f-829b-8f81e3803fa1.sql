-- Create a secure reward redemption function with proper transaction handling
-- This prevents race conditions by using row locking and atomic operations
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_profile_id UUID,
  p_reward_id UUID,
  p_points_cost INTEGER,
  p_shipping_address TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_reward RECORD;
  v_redemption_id UUID;
BEGIN
  -- Authorization check: ensure caller owns this profile or is admin
  IF NOT (
    EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Lock and fetch the profile row to prevent concurrent modifications
  SELECT id, total_points INTO v_profile
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Check if user has enough points
  IF v_profile.total_points < p_points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Lock and fetch the reward row to prevent concurrent stock modifications
  SELECT id, stock_quantity, is_active INTO v_reward
  FROM rewards
  WHERE id = p_reward_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;

  IF NOT v_reward.is_active THEN
    RAISE EXCEPTION 'Reward is not active';
  END IF;

  -- Check stock availability
  IF v_reward.stock_quantity <= 0 THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  -- Create redemption record
  INSERT INTO reward_redemptions (profile_id, reward_id, points_spent, shipping_address, status)
  VALUES (p_profile_id, p_reward_id, p_points_cost, p_shipping_address, 'pending')
  RETURNING id INTO v_redemption_id;

  -- Deduct points from profile
  UPDATE profiles
  SET total_points = total_points - p_points_cost
  WHERE id = p_profile_id;

  -- Record points transaction
  INSERT INTO points_transactions (profile_id, amount, transaction_type, source, source_id, description)
  VALUES (p_profile_id, p_points_cost, 'spend', 'reward_redemption', v_redemption_id, 
          (SELECT 'แลกของรางวัล: ' || name FROM rewards WHERE id = p_reward_id));

  -- Decrement stock
  UPDATE rewards
  SET stock_quantity = stock_quantity - 1
  WHERE id = p_reward_id;

  RETURN json_build_object('success', true, 'redemption_id', v_redemption_id);
END;
$$;
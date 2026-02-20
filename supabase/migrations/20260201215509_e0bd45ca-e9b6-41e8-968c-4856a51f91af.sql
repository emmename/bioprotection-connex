-- Add notes column to reward_redemptions table
ALTER TABLE public.reward_redemptions 
ADD COLUMN notes TEXT DEFAULT NULL;

-- Update the redeem_reward function to accept notes parameter
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_profile_id UUID,
  p_reward_id UUID,
  p_points_cost INTEGER,
  p_shipping_address TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward RECORD;
  v_profile RECORD;
  v_redemption_id UUID;
BEGIN
  -- Lock the reward row to prevent race conditions
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;
  
  IF NOT v_reward.is_active THEN
    RAISE EXCEPTION 'Reward is not active';
  END IF;
  
  IF v_reward.stock_quantity <= 0 THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;
  
  -- Lock the profile row
  SELECT * INTO v_profile FROM profiles WHERE id = p_profile_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  IF v_profile.total_points < p_points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;
  
  -- Deduct points
  UPDATE profiles 
  SET total_points = total_points - p_points_cost,
      updated_at = now()
  WHERE id = p_profile_id;
  
  -- Reduce stock
  UPDATE rewards 
  SET stock_quantity = stock_quantity - 1,
      updated_at = now()
  WHERE id = p_reward_id;
  
  -- Create redemption record with notes
  INSERT INTO reward_redemptions (profile_id, reward_id, points_spent, shipping_address, notes, status)
  VALUES (p_profile_id, p_reward_id, p_points_cost, p_shipping_address, p_notes, 'pending')
  RETURNING id INTO v_redemption_id;
  
  -- Record points transaction
  INSERT INTO points_transactions (profile_id, amount, transaction_type, source, source_id, description)
  VALUES (p_profile_id, p_points_cost, 'spend', 'reward_redemption', v_redemption_id, 'แลกของรางวัล: ' || v_reward.name);
  
  RETURN json_build_object('success', true, 'redemption_id', v_redemption_id);
END;
$$;
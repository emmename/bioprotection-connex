-- Create function for players to spend their own coins on games
-- This is separate from deduct_coins (admin-only) because players
-- need to spend coins on games without admin intervention.

CREATE OR REPLACE FUNCTION public.spend_coins_for_game(
  p_profile_id uuid,
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
    RAISE EXCEPTION 'Unauthorized: You can only spend your own coins';
  END IF;

  -- Check if profile has enough coins
  IF (SELECT total_coins FROM profiles WHERE id = p_profile_id) < p_amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  -- Deduct coins from profile
  UPDATE public.profiles
  SET total_coins = total_coins - p_amount
  WHERE id = p_profile_id;

  -- Insert transaction record
  INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'spend', 'game', COALESCE(p_description, 'เล่นเกม ' || p_game_type));
END;
$$;

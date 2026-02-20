-- Create function to deduct points (for admin use)
CREATE OR REPLACE FUNCTION public.deduct_points(
  p_profile_id uuid, 
  p_amount integer, 
  p_source text, 
  p_description text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Authorization check: only admins can deduct points
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can deduct points';
  END IF;

  -- Check if profile has enough points
  IF (SELECT total_points FROM profiles WHERE id = p_profile_id) < p_amount THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Deduct points from profile
  UPDATE public.profiles 
  SET total_points = total_points - p_amount 
  WHERE id = p_profile_id;
  
  -- Insert transaction record
  INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'spend', p_source, p_description);
END;
$$;

-- Create function to deduct coins (for admin use)
CREATE OR REPLACE FUNCTION public.deduct_coins(
  p_profile_id uuid, 
  p_amount integer, 
  p_source text, 
  p_description text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Authorization check: only admins can deduct coins
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can deduct coins';
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
  VALUES (p_profile_id, p_amount, 'spend', p_source, p_description);
END;
$$;
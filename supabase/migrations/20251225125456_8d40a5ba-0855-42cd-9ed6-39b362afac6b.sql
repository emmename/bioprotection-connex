-- Function to add coins to profile
CREATE OR REPLACE FUNCTION public.add_coins(
  p_profile_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile coins
  UPDATE public.profiles 
  SET total_coins = total_coins + p_amount 
  WHERE id = p_profile_id;
  
  -- Insert transaction record
  INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'earn', p_source, p_description);
END;
$$;

-- Function to add points to profile
CREATE OR REPLACE FUNCTION public.add_points(
  p_profile_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET total_points = total_points + p_amount 
  WHERE id = p_profile_id;
  
  INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'earn', p_source, p_description);
END;
$$;
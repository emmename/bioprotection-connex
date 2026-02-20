-- Fix security vulnerability: add authorization checks to add_points and add_coins functions
-- These functions must validate that the caller owns the target profile OR is an admin

CREATE OR REPLACE FUNCTION public.add_points(p_profile_id uuid, p_amount integer, p_source text, p_description text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: caller must own the profile or be an admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND user_id = auth.uid()) 
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: You can only add points to your own profile';
  END IF;

  UPDATE public.profiles 
  SET total_points = total_points + p_amount 
  WHERE id = p_profile_id;
  
  INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'earn', p_source, p_description);
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_coins(p_profile_id uuid, p_amount integer, p_source text, p_description text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: caller must own the profile or be an admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND user_id = auth.uid()) 
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: You can only add coins to your own profile';
  END IF;

  -- Update profile coins
  UPDATE public.profiles 
  SET total_coins = total_coins + p_amount 
  WHERE id = p_profile_id;
  
  -- Insert transaction record
  INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'earn', p_source, p_description);
END;
$function$;
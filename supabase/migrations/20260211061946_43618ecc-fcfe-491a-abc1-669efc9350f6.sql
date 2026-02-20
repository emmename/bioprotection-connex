
CREATE OR REPLACE FUNCTION public.auto_update_tier()
RETURNS TRIGGER AS $$
DECLARE
  new_tier public.tier_level;
BEGIN
  SELECT tier INTO new_tier
  FROM public.tier_settings
  WHERE NEW.total_points >= min_points
    AND (max_points IS NULL OR NEW.total_points <= max_points)
  LIMIT 1;

  IF new_tier IS NOT NULL AND new_tier IS DISTINCT FROM NEW.tier THEN
    NEW.tier := new_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

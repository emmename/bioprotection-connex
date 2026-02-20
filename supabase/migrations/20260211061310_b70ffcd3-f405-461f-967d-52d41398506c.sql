
-- Auto-update tier when total_points changes
CREATE OR REPLACE FUNCTION public.auto_update_tier()
RETURNS TRIGGER AS $$
DECLARE
  new_tier TEXT;
BEGIN
  SELECT tier INTO new_tier
  FROM public.tier_settings
  WHERE NEW.total_points >= min_points
    AND (max_points IS NULL OR NEW.total_points <= max_points)
  LIMIT 1;

  IF new_tier IS NOT NULL AND new_tier != NEW.tier THEN
    NEW.tier := new_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: fires before update on total_points
CREATE TRIGGER trigger_auto_update_tier
  BEFORE UPDATE OF total_points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_tier();

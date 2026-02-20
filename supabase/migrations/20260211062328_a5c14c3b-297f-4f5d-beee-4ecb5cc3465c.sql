
CREATE OR REPLACE FUNCTION public.notify_tier_upgrade()
RETURNS TRIGGER AS $$
DECLARE
  v_tier_name TEXT;
BEGIN
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    v_tier_name := UPPER(NEW.tier::text);
    
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    VALUES (
      NEW.id,
      '🎉 อัปเลเวลแล้ว!',
      'ยินดีด้วย! คุณได้อัปเลเวลเป็น ' || v_tier_name || ' เรียบร้อยแล้ว',
      'success',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_notify_tier_upgrade
  AFTER UPDATE OF tier ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tier_upgrade();

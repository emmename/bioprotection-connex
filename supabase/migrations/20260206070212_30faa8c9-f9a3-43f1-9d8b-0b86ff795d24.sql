-- Create function to award points for first daily receipt upload
CREATE OR REPLACE FUNCTION public.award_first_daily_receipt_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_receipt_count INTEGER;
BEGIN
  -- Count how many receipts this profile has uploaded today (excluding current one)
  SELECT COUNT(*) INTO v_receipt_count
  FROM public.receipts
  WHERE profile_id = NEW.profile_id
    AND DATE(created_at) = v_today
    AND id != NEW.id;
  
  -- If this is the first receipt of the day, award 50 points
  IF v_receipt_count = 0 THEN
    -- Add points using the secured RPC function
    INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
    VALUES (NEW.profile_id, 50, 'earn', 'daily_receipt_upload', 'รางวัลอัปโหลดใบเสร็จครั้งแรกของวัน');
    
    -- Update profile total points
    UPDATE public.profiles
    SET total_points = total_points + 50, updated_at = now()
    WHERE id = NEW.profile_id;
    
    -- Create notification for the user
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    VALUES (
      NEW.profile_id,
      'ได้รับคะแนนจากการอัปโหลดใบเสร็จ',
      'คุณได้รับ 50 คะแนนจากการอัปโหลดใบเสร็จครั้งแรกของวันนี้!',
      'success',
      '/receipts/upload'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for first daily receipt upload
DROP TRIGGER IF EXISTS on_first_daily_receipt_upload ON public.receipts;
CREATE TRIGGER on_first_daily_receipt_upload
  AFTER INSERT ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.award_first_daily_receipt_points();
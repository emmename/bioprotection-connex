-- Create function to notify receipt status changes
CREATE OR REPLACE FUNCTION public.notify_receipt_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status_text TEXT;
  v_message TEXT;
BEGIN
  -- Only trigger when status changes from pending
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    IF NEW.status = 'approved' THEN
      v_status_text := 'ได้รับการอนุมัติ';
      v_message := 'ใบเสร็จของคุณได้รับการอนุมัติแล้ว' || 
                   CASE WHEN NEW.points_awarded IS NOT NULL AND NEW.points_awarded > 0 
                        THEN ' ได้รับ ' || NEW.points_awarded || ' คะแนน'
                        ELSE '' END;
    ELSE
      v_status_text := 'ถูกปฏิเสธ';
      v_message := 'ใบเสร็จของคุณถูกปฏิเสธ' ||
                   CASE WHEN NEW.admin_notes IS NOT NULL AND NEW.admin_notes != ''
                        THEN ' เหตุผล: ' || NEW.admin_notes
                        ELSE '' END;
    END IF;
    
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    VALUES (
      NEW.profile_id,
      'อัปเดตสถานะใบเสร็จ: ' || v_status_text,
      v_message,
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
      '/receipts/upload'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for receipt status changes
DROP TRIGGER IF EXISTS on_receipt_status_change ON public.receipts;
CREATE TRIGGER on_receipt_status_change
  AFTER UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_receipt_status();
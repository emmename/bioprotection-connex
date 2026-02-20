
CREATE OR REPLACE FUNCTION public.notify_points_deducted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'spend' AND NEW.source = 'admin_adjustment' THEN
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    VALUES (
      NEW.profile_id,
      'คะแนนถูกปรับลด',
      'คะแนนของคุณถูกปรับลด ' || NEW.amount || ' คะแนน' || COALESCE(' - ' || NEW.description, ''),
      'warning',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_notify_points_deducted
  AFTER INSERT ON public.points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_points_deducted();

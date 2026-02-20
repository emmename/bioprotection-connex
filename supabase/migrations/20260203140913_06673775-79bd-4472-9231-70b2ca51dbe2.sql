-- Function to create notification for points earned
CREATE OR REPLACE FUNCTION public.notify_points_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.transaction_type = 'earn' THEN
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    VALUES (
      NEW.profile_id,
      'ได้รับคะแนน!',
      'คุณได้รับ ' || NEW.amount || ' คะแนน' || COALESCE(' จาก' || NEW.description, ''),
      'points',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Function to create notification for coins earned
CREATE OR REPLACE FUNCTION public.notify_coins_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.transaction_type = 'earn' THEN
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    VALUES (
      NEW.profile_id,
      'ได้รับเหรียญ!',
      'คุณได้รับ ' || NEW.amount || ' เหรียญ' || COALESCE(' จาก' || NEW.description, ''),
      'coins',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Function to create notification for redemption status update
CREATE OR REPLACE FUNCTION public.notify_redemption_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reward_name TEXT;
  v_status_text TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT name INTO v_reward_name FROM rewards WHERE id = NEW.reward_id;
    
    v_status_text := CASE NEW.status
      WHEN 'processing' THEN 'กำลังดำเนินการ'
      WHEN 'shipped' THEN 'จัดส่งแล้ว'
      WHEN 'completed' THEN 'เสร็จสมบูรณ์'
      WHEN 'cancelled' THEN 'ถูกยกเลิก'
      ELSE NEW.status
    END;
    
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    VALUES (
      NEW.profile_id,
      'อัพเดทสถานะการแลกของรางวัล',
      'รายการแลก "' || COALESCE(v_reward_name, 'ของรางวัล') || '" ' || v_status_text,
      'reward',
      '/my-redemptions'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Function to notify all approved members about new content
CREATE OR REPLACE FUNCTION public.notify_new_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_content_type_text TEXT;
BEGIN
  -- Only trigger when content is newly published
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    v_content_type_text := CASE NEW.content_type
      WHEN 'article' THEN 'บทความใหม่'
      WHEN 'video' THEN 'วิดีโอใหม่'
      WHEN 'quiz' THEN 'แบบทดสอบใหม่'
      WHEN 'survey' THEN 'แบบสำรวจใหม่'
      ELSE 'คอนเทนต์ใหม่'
    END;
    
    -- Insert notification for all approved members
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    SELECT 
      p.id,
      v_content_type_text || '!',
      '"' || NEW.title || '" - ' || COALESCE(NEW.description, 'มาดูกันเลย!'),
      'info',
      '/content/' || NEW.id
    FROM public.profiles p
    WHERE p.approval_status = 'approved';
  END IF;
  RETURN NEW;
END;
$$;

-- Function to notify all approved members about new missions
CREATE OR REPLACE FUNCTION public.notify_new_mission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when mission is active
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    -- Insert notification for all approved members
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    SELECT 
      p.id,
      'ภารกิจใหม่!',
      '"' || NEW.title || '" - รับ ' || NEW.points_reward || ' คะแนน และ ' || NEW.coins_reward || ' เหรียญ',
      'info',
      '/dashboard'
    FROM public.profiles p
    WHERE p.approval_status = 'approved';
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_points_earned
  AFTER INSERT ON public.points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_points_earned();

CREATE TRIGGER on_coins_earned
  AFTER INSERT ON public.coins_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_coins_earned();

CREATE TRIGGER on_redemption_status_change
  AFTER UPDATE ON public.reward_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_redemption_status();

CREATE TRIGGER on_content_published
  AFTER INSERT OR UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_content();

CREATE TRIGGER on_mission_created
  AFTER INSERT OR UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_mission();
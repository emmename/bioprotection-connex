
CREATE OR REPLACE FUNCTION public.award_first_daily_content_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_content_type TEXT;
  v_existing_count INTEGER;
  v_points INTEGER;
  v_description TEXT;
BEGIN
  -- Only trigger on completed content
  IF NEW.is_completed = false THEN
    RETURN NEW;
  END IF;

  -- Get the content type
  SELECT content_type INTO v_content_type
  FROM public.content
  WHERE id = NEW.content_id;

  IF v_content_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only handle article, video, quiz
  IF v_content_type NOT IN ('article', 'video', 'quiz') THEN
    RETURN NEW;
  END IF;

  -- Check if user already completed this content type today (excluding current record)
  SELECT COUNT(*) INTO v_existing_count
  FROM public.content_progress cp
  JOIN public.content c ON c.id = cp.content_id
  WHERE cp.profile_id = NEW.profile_id
    AND cp.is_completed = true
    AND DATE(cp.completed_at) = v_today
    AND c.content_type = v_content_type
    AND cp.id != NEW.id;

  -- If first completion of this type today, award points
  IF v_existing_count = 0 THEN
    IF v_content_type = 'article' THEN
      v_points := 10;
      v_description := 'รางวัลอ่านบทความครั้งแรกของวัน';
    ELSIF v_content_type = 'video' THEN
      v_points := 15;
      v_description := 'รางวัลดูวิดีโอครั้งแรกของวัน';
    ELSIF v_content_type = 'quiz' THEN
      v_points := 20;
      v_description := 'รางวัลทำควิซครั้งแรกของวัน';
    END IF;

    -- Insert points transaction
    INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
    VALUES (NEW.profile_id, v_points, 'earn', 'daily_' || v_content_type, v_description);

    -- Update profile total points
    UPDATE public.profiles
    SET total_points = total_points + v_points, updated_at = now()
    WHERE id = NEW.profile_id;

    -- Create notification
    INSERT INTO public.notifications (profile_id, title, message, type, link)
    VALUES (
      NEW.profile_id,
      'ได้รับคะแนนจากภารกิจประจำวัน!',
      'คุณได้รับ ' || v_points || ' คะแนน - ' || v_description,
      'success',
      '/dashboard'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger on INSERT and UPDATE (content_progress may be inserted as incomplete then updated to completed)
CREATE TRIGGER on_first_daily_content_completion
  AFTER INSERT OR UPDATE OF is_completed ON public.content_progress
  FOR EACH ROW
  WHEN (NEW.is_completed = true)
  EXECUTE FUNCTION public.award_first_daily_content_points();

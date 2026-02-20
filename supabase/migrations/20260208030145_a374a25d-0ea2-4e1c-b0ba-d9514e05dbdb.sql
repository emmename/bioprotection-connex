
-- Trigger function: award points and coins when mission completion is approved
CREATE OR REPLACE FUNCTION public.award_mission_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mission RECORD;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Get mission rewards
    SELECT points_reward, coins_reward, title INTO v_mission
    FROM public.missions
    WHERE id = NEW.mission_id;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    -- Award points if > 0
    IF v_mission.points_reward > 0 THEN
      NEW.points_earned := v_mission.points_reward;

      UPDATE public.profiles
      SET total_points = total_points + v_mission.points_reward, updated_at = now()
      WHERE id = NEW.profile_id;

      INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, source_id, description)
      VALUES (NEW.profile_id, v_mission.points_reward, 'earn', 'mission_completion', NEW.id, 'ภารกิจ: ' || v_mission.title);
    END IF;

    -- Award coins if > 0
    IF v_mission.coins_reward > 0 THEN
      NEW.coins_earned := v_mission.coins_reward;

      UPDATE public.profiles
      SET total_coins = total_coins + v_mission.coins_reward, updated_at = now()
      WHERE id = NEW.profile_id;

      INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, source_id, description)
      VALUES (NEW.profile_id, v_mission.coins_reward, 'earn', 'mission_completion', NEW.id, 'ภารกิจ: ' || v_mission.title);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on mission_completions
CREATE TRIGGER on_mission_completion_approved
  BEFORE UPDATE ON public.mission_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_mission_completion();

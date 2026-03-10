-- ========================================
-- SEQUENTIAL MISSIONS (QUEST CHAINS)
-- ========================================

-- Create mission_groups table to group missions together
CREATE TABLE public.mission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  grand_bonus_coins INTEGER NOT NULL DEFAULT 0,
  grand_bonus_points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alter missions table to add linking to groups
ALTER TABLE public.missions
  ADD COLUMN group_id UUID REFERENCES public.mission_groups(id) ON DELETE SET NULL,
  ADD COLUMN sequence_order INTEGER,
  ADD COLUMN prerequisite_mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL;

-- Create user_mission_groups table to track group completion
CREATE TABLE public.user_mission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.mission_groups(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  bonus_coins_earned INTEGER NOT NULL DEFAULT 0,
  bonus_points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, group_id)
);

-- Set updated_at triggers
CREATE TRIGGER update_mission_groups_updated_at
  BEFORE UPDATE ON public.mission_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_mission_groups_updated_at
  BEFORE UPDATE ON public.user_mission_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ========================================
-- RLS POLICIES FOR SEQUENTIAL MISSIONS
-- ========================================
ALTER TABLE public.mission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mission_groups ENABLE ROW LEVEL SECURITY;

-- mission_groups
CREATE POLICY "Anyone can view active mission groups"
  ON public.mission_groups FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all mission groups"
  ON public.mission_groups FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- user_mission_groups
CREATE POLICY "Users can view own user mission groups"
  ON public.user_mission_groups FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all user mission groups"
  ON public.user_mission_groups FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- DATABASE TRIGGER TO AWARD GRAND BONUS
-- ========================================

CREATE OR REPLACE FUNCTION public.check_mission_group_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
  v_total_missions INTEGER;
  v_completed_missions INTEGER;
  v_grand_bonus_coins INTEGER;
  v_grand_bonus_points INTEGER;
  v_user_group_exists BOOLEAN;
BEGIN
  -- Only proceed if the mission was just completed / approved
  IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
    
    -- Find if this mission belongs to a group
    SELECT group_id INTO v_group_id FROM public.missions WHERE id = NEW.mission_id;
    
    IF v_group_id IS NOT NULL THEN
      -- Count total active missions in this group
      SELECT COUNT(*) INTO v_total_missions FROM public.missions WHERE group_id = v_group_id AND is_active = true;
      
      -- Count how many of those missions this user has completed
      SELECT COUNT(*) INTO v_completed_missions
      FROM public.mission_completions mc
      JOIN public.missions m ON mc.mission_id = m.id
      WHERE m.group_id = v_group_id 
        AND mc.profile_id = NEW.profile_id
        AND mc.status = 'approved'
        AND m.is_active = true;
      
      -- If the user has completed ALL missions in the group
      IF v_completed_missions >= v_total_missions AND v_total_missions > 0 THEN
        
        -- Check if user already got the group bonus
        SELECT EXISTS (
          SELECT 1 FROM public.user_mission_groups 
          WHERE profile_id = NEW.profile_id AND group_id = v_group_id AND is_completed = true
        ) INTO v_user_group_exists;
        
        IF NOT v_user_group_exists THEN
          -- Get the grand bonus amounts
          SELECT grand_bonus_coins, grand_bonus_points INTO v_grand_bonus_coins, v_grand_bonus_points
          FROM public.mission_groups
          WHERE id = v_group_id;
          
          -- Record group completion
          INSERT INTO public.user_mission_groups (profile_id, group_id, is_completed, completed_at, bonus_coins_earned, bonus_points_earned)
          VALUES (NEW.profile_id, v_group_id, true, now(), v_grand_bonus_coins, v_grand_bonus_points)
          ON CONFLICT (profile_id, group_id) 
          DO UPDATE SET is_completed = true, completed_at = now(), bonus_coins_earned = v_grand_bonus_coins, bonus_points_earned = v_grand_bonus_points;
          
          -- Give Grand Bonus Points
          IF v_grand_bonus_points > 0 THEN
            UPDATE public.profiles SET total_points = COALESCE(total_points, 0) + v_grand_bonus_points WHERE id = NEW.profile_id;
            INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
            VALUES (NEW.profile_id, v_grand_bonus_points, 'earn', 'mission_group_bonus', 'Group Mission Completion Bonus');
          END IF;
          
          -- Give Grand Bonus Coins
          IF v_grand_bonus_coins > 0 THEN
            UPDATE public.profiles SET total_coins = COALESCE(total_coins, 0) + v_grand_bonus_coins WHERE id = NEW.profile_id;
            INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description)
            VALUES (NEW.profile_id, v_grand_bonus_coins, 'earn', 'mission_group_bonus', 'Group Mission Completion Bonus');
          END IF;
          
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_mission_group_completion_trigger
  AFTER INSERT OR UPDATE ON public.mission_completions
  FOR EACH ROW EXECUTE FUNCTION public.check_mission_group_completion();

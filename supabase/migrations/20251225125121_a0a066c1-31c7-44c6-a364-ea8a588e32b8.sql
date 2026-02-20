-- ========================================
-- ENUMS
-- ========================================

-- Member types
CREATE TYPE public.member_type AS ENUM (
  'farm',
  'company_employee',
  'veterinarian',
  'livestock_shop',
  'government',
  'other'
);

-- Tier levels
CREATE TYPE public.tier_level AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Vet types
CREATE TYPE public.vet_type AS ENUM ('livestock', 'hospital_clinic');

-- Company business types
CREATE TYPE public.company_business AS ENUM (
  'animal_production',
  'animal_feed',
  'veterinary_distribution',
  'other'
);

-- Approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Content types
CREATE TYPE public.content_type AS ENUM ('article', 'video', 'quiz', 'survey');

-- Transaction types
CREATE TYPE public.transaction_type AS ENUM ('earn', 'spend');

-- App roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ========================================
-- PROFILES TABLE
-- ========================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  line_user_id TEXT,
  member_id TEXT UNIQUE,
  nickname TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT,
  province TEXT,
  district TEXT,
  subdistrict TEXT,
  postal_code TEXT,
  phone TEXT,
  line_id TEXT,
  member_type member_type NOT NULL,
  approval_status approval_status NOT NULL DEFAULT 'pending',
  tier tier_level NOT NULL DEFAULT 'bronze',
  total_points INTEGER NOT NULL DEFAULT 0,
  total_coins INTEGER NOT NULL DEFAULT 0,
  interests TEXT[],
  known_products TEXT[],
  referral_source TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- USER ROLES TABLE (SECURITY)
-- ========================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ========================================
-- MEMBER DETAIL TABLES
-- ========================================

-- Farm details
CREATE TABLE public.farm_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  farm_name TEXT NOT NULL,
  animal_types TEXT[],
  position TEXT,
  animal_count TEXT,
  building_count TEXT,
  pest_problems TEXT[],
  pest_control_methods TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company employee details
CREATE TABLE public.company_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  business_type company_business NOT NULL,
  position TEXT,
  is_elanco BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Veterinarian details
CREATE TABLE public.vet_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  vet_type vet_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Livestock shop details
CREATE TABLE public.shop_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  shop_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Government details
CREATE TABLE public.government_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- TIER SETTINGS
-- ========================================

CREATE TABLE public.tier_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier tier_level NOT NULL UNIQUE,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  benefits TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default tier settings
INSERT INTO public.tier_settings (tier, min_points, max_points, benefits) VALUES
  ('bronze', 0, 999, ARRAY['Basic rewards access']),
  ('silver', 1000, 4999, ARRAY['10% bonus points', 'Priority support']),
  ('gold', 5000, 9999, ARRAY['20% bonus points', 'Exclusive rewards', 'VIP events']),
  ('platinum', 10000, NULL, ARRAY['30% bonus points', 'All exclusive rewards', 'Personal advisor']);

-- ========================================
-- POINTS & COINS TRANSACTIONS
-- ========================================

CREATE TABLE public.points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type transaction_type NOT NULL,
  source TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.coins_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type transaction_type NOT NULL,
  source TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- CONTENT TABLES
-- ========================================

CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type content_type NOT NULL,
  content_body TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  points_reward INTEGER NOT NULL DEFAULT 0,
  target_member_types member_type[],
  target_tiers tier_level[],
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Survey questions
CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content completion tracking
CREATE TABLE public.content_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  quiz_score INTEGER,
  survey_responses JSONB,
  points_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, content_id)
);

-- ========================================
-- REWARDS CATALOG
-- ========================================

CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  points_cost INTEGER NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  target_tiers tier_level[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reward redemptions
CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  shipping_address TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- RECEIPTS
-- ========================================

CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  amount DECIMAL(10,2),
  status approval_status NOT NULL DEFAULT 'pending',
  points_awarded INTEGER,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- DAILY CHECK-IN
-- ========================================

CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  checkin_date DATE NOT NULL,
  streak_count INTEGER NOT NULL DEFAULT 1,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, checkin_date)
);

-- Check-in rewards settings
CREATE TABLE public.checkin_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER NOT NULL UNIQUE,
  coins_reward INTEGER NOT NULL,
  is_bonus BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default check-in rewards (7-day cycle)
INSERT INTO public.checkin_rewards (day_number, coins_reward, is_bonus) VALUES
  (1, 5, false),
  (2, 5, false),
  (3, 10, false),
  (4, 10, false),
  (5, 15, false),
  (6, 15, false),
  (7, 50, true);

-- ========================================
-- MISSIONS & ACTIVITIES
-- ========================================

CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL,
  qr_code TEXT,
  location TEXT,
  coins_reward INTEGER NOT NULL DEFAULT 0,
  points_reward INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mission_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE NOT NULL,
  proof_image_url TEXT,
  status approval_status NOT NULL DEFAULT 'pending',
  coins_earned INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, mission_id)
);

-- ========================================
-- GAMES
-- ========================================

CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  coins_spent INTEGER NOT NULL DEFAULT 0,
  rewards_earned JSONB,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.game_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL UNIQUE,
  free_plays_per_day INTEGER NOT NULL DEFAULT 1,
  coins_per_extra_play INTEGER NOT NULL DEFAULT 10,
  min_reward_coins INTEGER NOT NULL DEFAULT 0,
  max_reward_coins INTEGER NOT NULL DEFAULT 20,
  min_reward_points INTEGER NOT NULL DEFAULT 0,
  max_reward_points INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default game settings
INSERT INTO public.game_settings (game_type, free_plays_per_day, coins_per_extra_play, max_reward_coins, max_reward_points) VALUES
  ('matching', 1, 10, 20, 50),
  ('flip_cards', 1, 10, 15, 30),
  ('spin_wheel', 1, 15, 30, 100),
  ('quiz_game', 1, 5, 10, 50);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to check user role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user profile id
CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id
$$;

-- Function to generate member ID
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  prefix TEXT := 'ELC';
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.profiles;
  new_id := prefix || LPAD(counter::TEXT, 6, '0');
  RETURN new_id;
END;
$$;

-- Auto-generate member_id on profile insert
CREATE OR REPLACE FUNCTION public.set_member_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.member_id IS NULL THEN
    NEW.member_id := generate_member_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_member_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_member_id();

-- Update timestamps function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coins_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES - PROFILES
-- ========================================

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - USER ROLES
-- ========================================

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - MEMBER DETAILS
-- ========================================

-- Farm details
CREATE POLICY "Users can manage own farm details"
  ON public.farm_details FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all farm details"
  ON public.farm_details FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Company details
CREATE POLICY "Users can manage own company details"
  ON public.company_details FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all company details"
  ON public.company_details FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Vet details
CREATE POLICY "Users can manage own vet details"
  ON public.vet_details FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all vet details"
  ON public.vet_details FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Shop details
CREATE POLICY "Users can manage own shop details"
  ON public.shop_details FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all shop details"
  ON public.shop_details FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Government details
CREATE POLICY "Users can manage own government details"
  ON public.government_details FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all government details"
  ON public.government_details FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - TIER SETTINGS (Public read)
-- ========================================

CREATE POLICY "Anyone can view tier settings"
  ON public.tier_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tier settings"
  ON public.tier_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - TRANSACTIONS
-- ========================================

CREATE POLICY "Users can view own points transactions"
  ON public.points_transactions FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all points transactions"
  ON public.points_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own coins transactions"
  ON public.coins_transactions FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all coins transactions"
  ON public.coins_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - CONTENT (Public read for published)
-- ========================================

CREATE POLICY "Anyone can view published content"
  ON public.content FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Admins can manage all content"
  ON public.content FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view quiz questions"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (content_id IN (SELECT id FROM public.content WHERE is_published = true));

CREATE POLICY "Admins can manage quiz questions"
  ON public.quiz_questions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view survey questions"
  ON public.survey_questions FOR SELECT
  TO authenticated
  USING (content_id IN (SELECT id FROM public.content WHERE is_published = true));

CREATE POLICY "Admins can manage survey questions"
  ON public.survey_questions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Content progress
CREATE POLICY "Users can manage own content progress"
  ON public.content_progress FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all content progress"
  ON public.content_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - REWARDS
-- ========================================

CREATE POLICY "Anyone can view active rewards"
  ON public.rewards FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all rewards"
  ON public.rewards FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own redemptions"
  ON public.reward_redemptions FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create own redemptions"
  ON public.reward_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all redemptions"
  ON public.reward_redemptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - RECEIPTS
-- ========================================

CREATE POLICY "Users can view own receipts"
  ON public.receipts FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create own receipts"
  ON public.receipts FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all receipts"
  ON public.receipts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - DAILY CHECKINS
-- ========================================

CREATE POLICY "Users can manage own checkins"
  ON public.daily_checkins FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all checkins"
  ON public.daily_checkins FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view checkin rewards"
  ON public.checkin_rewards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage checkin rewards"
  ON public.checkin_rewards FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - MISSIONS
-- ========================================

CREATE POLICY "Anyone can view active missions"
  ON public.missions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all missions"
  ON public.missions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own mission completions"
  ON public.mission_completions FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all mission completions"
  ON public.mission_completions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- RLS POLICIES - GAMES
-- ========================================

CREATE POLICY "Users can manage own game sessions"
  ON public.game_sessions FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all game sessions"
  ON public.game_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view game settings"
  ON public.game_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage game settings"
  ON public.game_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
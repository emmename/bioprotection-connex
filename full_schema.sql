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
  USING (public.has_role(auth.uid(), 'admin'));-- Fix function search_path for security
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;-- Function to add coins to profile
CREATE OR REPLACE FUNCTION public.add_coins(
  p_profile_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile coins
  UPDATE public.profiles 
  SET total_coins = total_coins + p_amount 
  WHERE id = p_profile_id;
  
  -- Insert transaction record
  INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'earn', p_source, p_description);
END;
$$;

-- Function to add points to profile
CREATE OR REPLACE FUNCTION public.add_points(
  p_profile_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET total_points = total_points + p_amount 
  WHERE id = p_profile_id;
  
  INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'earn', p_source, p_description);
END;
$$;-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload receipts
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view own receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all receipts
CREATE POLICY "Admins can view all receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts' 
  AND public.has_role(auth.uid(), 'admin')
);-- Add tier-specific pricing and multiple images columns to rewards table
ALTER TABLE public.rewards 
ADD COLUMN IF NOT EXISTS tier_points_cost jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- Update existing records to have tier_points_cost based on current points_cost
UPDATE public.rewards 
SET tier_points_cost = jsonb_build_object(
  'bronze', points_cost,
  'silver', points_cost,
  'gold', points_cost,
  'platinum', points_cost
)
WHERE tier_points_cost = '{}' OR tier_points_cost IS NULL;

-- If image_url exists, add it to images array
UPDATE public.rewards 
SET images = ARRAY[image_url]
WHERE image_url IS NOT NULL AND (images = '{}' OR images IS NULL);-- Create storage bucket for reward images
INSERT INTO storage.buckets (id, name, public)
VALUES ('reward-images', 'reward-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for reward images
CREATE POLICY "Anyone can view reward images"
ON storage.objects FOR SELECT
USING (bucket_id = 'reward-images');

CREATE POLICY "Admins can upload reward images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reward-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reward images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reward-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reward images"
ON storage.objects FOR DELETE
USING (bucket_id = 'reward-images' AND has_role(auth.uid(), 'admin'));-- Fix security vulnerability: add authorization checks to add_points and add_coins functions
-- These functions must validate that the caller owns the target profile OR is an admin

CREATE OR REPLACE FUNCTION public.add_points(p_profile_id uuid, p_amount integer, p_source text, p_description text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: caller must own the profile or be an admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND user_id = auth.uid()) 
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: You can only add points to your own profile';
  END IF;

  UPDATE public.profiles 
  SET total_points = total_points + p_amount 
  WHERE id = p_profile_id;
  
  INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'earn', p_source, p_description);
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_coins(p_profile_id uuid, p_amount integer, p_source text, p_description text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: caller must own the profile or be an admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND user_id = auth.uid()) 
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: You can only add coins to your own profile';
  END IF;

  -- Update profile coins
  UPDATE public.profiles 
  SET total_coins = total_coins + p_amount 
  WHERE id = p_profile_id;
  
  -- Insert transaction record
  INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'earn', p_source, p_description);
END;
$function$;-- Create a secure reward redemption function with proper transaction handling
-- This prevents race conditions by using row locking and atomic operations
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_profile_id UUID,
  p_reward_id UUID,
  p_points_cost INTEGER,
  p_shipping_address TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_reward RECORD;
  v_redemption_id UUID;
BEGIN
  -- Authorization check: ensure caller owns this profile or is admin
  IF NOT (
    EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Lock and fetch the profile row to prevent concurrent modifications
  SELECT id, total_points INTO v_profile
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Check if user has enough points
  IF v_profile.total_points < p_points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Lock and fetch the reward row to prevent concurrent stock modifications
  SELECT id, stock_quantity, is_active INTO v_reward
  FROM rewards
  WHERE id = p_reward_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;

  IF NOT v_reward.is_active THEN
    RAISE EXCEPTION 'Reward is not active';
  END IF;

  -- Check stock availability
  IF v_reward.stock_quantity <= 0 THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  -- Create redemption record
  INSERT INTO reward_redemptions (profile_id, reward_id, points_spent, shipping_address, status)
  VALUES (p_profile_id, p_reward_id, p_points_cost, p_shipping_address, 'pending')
  RETURNING id INTO v_redemption_id;

  -- Deduct points from profile
  UPDATE profiles
  SET total_points = total_points - p_points_cost
  WHERE id = p_profile_id;

  -- Record points transaction
  INSERT INTO points_transactions (profile_id, amount, transaction_type, source, source_id, description)
  VALUES (p_profile_id, p_points_cost, 'spend', 'reward_redemption', v_redemption_id, 
          (SELECT 'แลกของรางวัล: ' || name FROM rewards WHERE id = p_reward_id));

  -- Decrement stock
  UPDATE rewards
  SET stock_quantity = stock_quantity - 1
  WHERE id = p_reward_id;

  RETURN json_build_object('success', true, 'redemption_id', v_redemption_id);
END;
$$;-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;-- Create function to deduct points (for admin use)
CREATE OR REPLACE FUNCTION public.deduct_points(
  p_profile_id uuid, 
  p_amount integer, 
  p_source text, 
  p_description text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Authorization check: only admins can deduct points
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can deduct points';
  END IF;

  -- Check if profile has enough points
  IF (SELECT total_points FROM profiles WHERE id = p_profile_id) < p_amount THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Deduct points from profile
  UPDATE public.profiles 
  SET total_points = total_points - p_amount 
  WHERE id = p_profile_id;
  
  -- Insert transaction record
  INSERT INTO public.points_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'spend', p_source, p_description);
END;
$$;

-- Create function to deduct coins (for admin use)
CREATE OR REPLACE FUNCTION public.deduct_coins(
  p_profile_id uuid, 
  p_amount integer, 
  p_source text, 
  p_description text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Authorization check: only admins can deduct coins
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can deduct coins';
  END IF;

  -- Check if profile has enough coins
  IF (SELECT total_coins FROM profiles WHERE id = p_profile_id) < p_amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  -- Deduct coins from profile
  UPDATE public.profiles 
  SET total_coins = total_coins - p_amount 
  WHERE id = p_profile_id;
  
  -- Insert transaction record
  INSERT INTO public.coins_transactions (profile_id, amount, transaction_type, source, description)
  VALUES (p_profile_id, p_amount, 'spend', p_source, p_description);
END;
$$;-- Add DELETE policy for admins on profiles table
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add ON DELETE CASCADE to related tables if not already set
ALTER TABLE public.farm_details 
DROP CONSTRAINT IF EXISTS farm_details_profile_id_fkey,
ADD CONSTRAINT farm_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.company_details 
DROP CONSTRAINT IF EXISTS company_details_profile_id_fkey,
ADD CONSTRAINT company_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.vet_details 
DROP CONSTRAINT IF EXISTS vet_details_profile_id_fkey,
ADD CONSTRAINT vet_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.shop_details 
DROP CONSTRAINT IF EXISTS shop_details_profile_id_fkey,
ADD CONSTRAINT shop_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.government_details 
DROP CONSTRAINT IF EXISTS government_details_profile_id_fkey,
ADD CONSTRAINT government_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.daily_checkins 
DROP CONSTRAINT IF EXISTS daily_checkins_profile_id_fkey,
ADD CONSTRAINT daily_checkins_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.points_transactions 
DROP CONSTRAINT IF EXISTS points_transactions_profile_id_fkey,
ADD CONSTRAINT points_transactions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coins_transactions 
DROP CONSTRAINT IF EXISTS coins_transactions_profile_id_fkey,
ADD CONSTRAINT coins_transactions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.receipts 
DROP CONSTRAINT IF EXISTS receipts_profile_id_fkey,
ADD CONSTRAINT receipts_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reward_redemptions 
DROP CONSTRAINT IF EXISTS reward_redemptions_profile_id_fkey,
ADD CONSTRAINT reward_redemptions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.content_progress 
DROP CONSTRAINT IF EXISTS content_progress_profile_id_fkey,
ADD CONSTRAINT content_progress_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.game_sessions 
DROP CONSTRAINT IF EXISTS game_sessions_profile_id_fkey,
ADD CONSTRAINT game_sessions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.mission_completions 
DROP CONSTRAINT IF EXISTS mission_completions_profile_id_fkey,
ADD CONSTRAINT mission_completions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;-- Add category column to rewards table
ALTER TABLE public.rewards 
ADD COLUMN category text DEFAULT 'general';

-- Create an index for faster category filtering
CREATE INDEX idx_rewards_category ON public.rewards(category);

-- Add a comment to document the expected values
COMMENT ON COLUMN public.rewards.category IS 'Category of reward: all, farm-equipment, general, glass, clothing';-- Create reward_categories table
CREATE TABLE public.reward_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT 'tag',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reward_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active categories" 
ON public.reward_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all categories" 
ON public.reward_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_reward_categories_updated_at
BEFORE UPDATE ON public.reward_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default categories
INSERT INTO public.reward_categories (name, slug, icon, sort_order) VALUES
('อุปกรณ์ในฟาร์ม', 'farm-equipment', 'tractor', 1),
('ของใช้ทั่วไป', 'general', 'package', 2),
('แก้วน้ำ', 'glass', 'glass-water', 3),
('เครื่องแต่งกาย', 'clothing', 'shirt', 4);

-- Create index for faster queries
CREATE INDEX idx_reward_categories_slug ON public.reward_categories(slug);
CREATE INDEX idx_reward_categories_sort_order ON public.reward_categories(sort_order);-- Add notes column to reward_redemptions table
ALTER TABLE public.reward_redemptions 
ADD COLUMN notes TEXT DEFAULT NULL;

-- Update the redeem_reward function to accept notes parameter
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_profile_id UUID,
  p_reward_id UUID,
  p_points_cost INTEGER,
  p_shipping_address TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward RECORD;
  v_profile RECORD;
  v_redemption_id UUID;
BEGIN
  -- Lock the reward row to prevent race conditions
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;
  
  IF NOT v_reward.is_active THEN
    RAISE EXCEPTION 'Reward is not active';
  END IF;
  
  IF v_reward.stock_quantity <= 0 THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;
  
  -- Lock the profile row
  SELECT * INTO v_profile FROM profiles WHERE id = p_profile_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  IF v_profile.total_points < p_points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;
  
  -- Deduct points
  UPDATE profiles 
  SET total_points = total_points - p_points_cost,
      updated_at = now()
  WHERE id = p_profile_id;
  
  -- Reduce stock
  UPDATE rewards 
  SET stock_quantity = stock_quantity - 1,
      updated_at = now()
  WHERE id = p_reward_id;
  
  -- Create redemption record with notes
  INSERT INTO reward_redemptions (profile_id, reward_id, points_spent, shipping_address, notes, status)
  VALUES (p_profile_id, p_reward_id, p_points_cost, p_shipping_address, p_notes, 'pending')
  RETURNING id INTO v_redemption_id;
  
  -- Record points transaction
  INSERT INTO points_transactions (profile_id, amount, transaction_type, source, source_id, description)
  VALUES (p_profile_id, p_points_cost, 'spend', 'reward_redemption', v_redemption_id, 'แลกของรางวัล: ' || v_reward.name);
  
  RETURN json_build_object('success', true, 'redemption_id', v_redemption_id);
END;
$$;-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, points, coins, reward
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT, -- optional link to navigate to
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_notifications_profile_id ON public.notifications(profile_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);-- Function to create notification for points earned
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
  EXECUTE FUNCTION public.notify_new_mission();-- Create storage policies for content images in receipts bucket

-- Allow authenticated users to upload files to the articles folder
CREATE POLICY "Allow authenticated users to upload article images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = 'articles'
);

-- Allow public read access to article images
CREATE POLICY "Allow public to view article images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = 'articles'
);

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Allow authenticated users to upload thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = 'thumbnails'
);

-- Allow public read access to thumbnails
CREATE POLICY "Allow public to view thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = 'thumbnails'
);-- Create function to notify receipt status changes
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
  EXECUTE FUNCTION public.notify_receipt_status();-- Create function to award points for first daily receipt upload
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

CREATE OR REPLACE FUNCTION public.auto_update_tier()
RETURNS TRIGGER AS $$
DECLARE
  new_tier public.tier_level;
BEGIN
  SELECT tier INTO new_tier
  FROM public.tier_settings
  WHERE NEW.total_points >= min_points
    AND (max_points IS NULL OR NEW.total_points <= max_points)
  LIMIT 1;

  IF new_tier IS NOT NULL AND new_tier IS DISTINCT FROM NEW.tier THEN
    NEW.tier := new_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
  -- Cast to text explicitly to match the variable type
  SELECT content_type::text INTO v_content_type
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
  -- Cast column to text for comparison
  SELECT COUNT(*) INTO v_existing_count
  FROM public.content_progress cp
  JOIN public.content c ON c.id = cp.content_id
  WHERE cp.profile_id = NEW.profile_id
    AND cp.is_completed = true
    AND DATE(cp.completed_at) = v_today
    AND c.content_type::text = v_content_type
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
-- Add display_name column to tier_settings
ALTER TABLE public.tier_settings 
ADD COLUMN display_name TEXT;

-- Populate existing rows with default values
UPDATE public.tier_settings SET display_name = 'Bronze' WHERE tier = 'bronze';
UPDATE public.tier_settings SET display_name = 'Silver' WHERE tier = 'silver';
UPDATE public.tier_settings SET display_name = 'Gold' WHERE tier = 'gold';
UPDATE public.tier_settings SET display_name = 'Platinum' WHERE tier = 'platinum';

-- Set column as NOT NULL after population
ALTER TABLE public.tier_settings 
ALTER COLUMN display_name SET NOT NULL;
-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies for system_settings
CREATE POLICY "Anyone can view system settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default exchange rate (1 Coin = 1 Point by default, adjustable)
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('coins_to_points_ratio', '1', 'Number of points received for 1 coin');

-- Function to exchange coins for points
CREATE OR REPLACE FUNCTION public.exchange_coins_to_points(p_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rate INTEGER;
  v_points_to_receive INTEGER;
  v_current_coins INTEGER;
  v_settings_record RECORD;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'จำนวนเหรียญต้องมากกว่า 0');
  END IF;

  -- Get current exchange rate
  SELECT value::INTEGER INTO v_rate
  FROM public.system_settings
  WHERE key = 'coins_to_points_ratio';

  IF v_rate IS NULL THEN
    -- Fallback default
    v_rate := 1;
  END IF;

  v_points_to_receive := p_amount * v_rate;

  -- Check user's coin balance
  SELECT total_coins INTO v_current_coins
  FROM public.profiles
  WHERE id = (SELECT id FROM public.profiles WHERE user_id = v_user_id);

  IF v_current_coins IS NULL OR v_current_coins < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'เหรียญไม่พอสำหรับแลก');
  END IF;

  -- Perform transaction
  -- 1. Deduct coins
  -- 2. Add points
  -- 3. Record transactions
  
  -- Get owner profile id
  DECLARE
    v_profile_id UUID;
  BEGIN
    SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user_id;

    -- Update profile
    UPDATE public.profiles
    SET 
      total_coins = total_coins - p_amount,
      total_points = total_points + v_points_to_receive,
      updated_at = now()
    WHERE id = v_profile_id;

    -- Record Coin transaction (Spend)
    INSERT INTO public.coins_transactions (
      profile_id, 
      amount, 
      transaction_type, 
      source, 
      description
    ) VALUES (
      v_profile_id, 
      p_amount, 
      'spend', 
      'exchange_to_points', 
      'แลกเป็น ' || v_points_to_receive || ' คะแนน'
    );

    -- Record Point transaction (Earn)
    INSERT INTO public.points_transactions (
      profile_id, 
      amount, 
      transaction_type, 
      source, 
      description
    ) VALUES (
      v_profile_id, 
      v_points_to_receive, 
      'earn', 
      'exchange_from_coins', 
      'แลกจาก ' || p_amount || ' เหรียญ'
    );
    
    -- Create notification
    INSERT INTO public.notifications (
      profile_id, 
      title, 
      message, 
      type, 
      link
    ) VALUES (
      v_profile_id,
      'แลกคะแนนสำเร็จ!',
      'คุณใช้ ' || p_amount || ' เหรียญ แลกได้รับ ' || v_points_to_receive || ' คะแนน',
      'success',
      '/points-history'
    );

  END;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'แลกคะแนนสำเร็จ! คุณได้รับ ' || v_points_to_receive || ' คะแนน',
    'points_received', v_points_to_receive
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'เกิดข้อผิดพลาด: ' || SQLERRM);
END;
$$;
-- Seed new system settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('exchange_is_active', 'true', 'Turn on/off coin exchange feature'),
  ('exchange_min_coins', '100', 'Minimum coins required to exchange'),
  ('exchange_max_daily_coins', '5000', 'Maximum coins allowed to exchange per day'),
  ('coins_per_point', '10', 'Number of coins needed to get 1 point (Rate: X Coins = 1 Point)')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Update exchange function with new logic
CREATE OR REPLACE FUNCTION public.exchange_coins_to_points(p_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  -- Settings variables
  v_is_active BOOLEAN;
  v_min_coins INTEGER;
  v_max_daily INTEGER;
  v_rate INTEGER; -- Coins per 1 Point
  
  -- Calculation variables
  v_points_to_receive INTEGER;
  v_coins_to_deduct INTEGER;
  v_current_coins INTEGER;
  v_daily_spent INTEGER;
  v_profile_id UUID;
BEGIN
  -- 1. Fetch System Settings
  SELECT value::BOOLEAN INTO v_is_active FROM public.system_settings WHERE key = 'exchange_is_active';
  SELECT value::INTEGER INTO v_min_coins FROM public.system_settings WHERE key = 'exchange_min_coins';
  SELECT value::INTEGER INTO v_max_daily FROM public.system_settings WHERE key = 'exchange_max_daily_coins';
  SELECT value::INTEGER INTO v_rate FROM public.system_settings WHERE key = 'coins_per_point';

  -- Set defaults if missing
  IF v_is_active IS NULL THEN v_is_active := true; END IF;
  IF v_min_coins IS NULL THEN v_min_coins := 100; END IF;
  IF v_max_daily IS NULL THEN v_max_daily := 5000; END IF;
  IF v_rate IS NULL OR v_rate <= 0 THEN v_rate := 1; END IF;

  -- 2. System Checks
  IF v_is_active = false THEN
    RETURN jsonb_build_object('success', false, 'message', 'ระบบแลกคะแนนปิดปรับปรุงชั่วคราว');
  END IF;

  IF p_amount < v_min_coins THEN
    RETURN jsonb_build_object('success', false, 'message', 'ต้องแลกขั้นต่ำ ' || v_min_coins || ' เหรียญ');
  END IF;

  -- 3. Calculate Logic (Coins per Point)
  -- Example: Rate=10, Amount=15 -> Points=1, Deduct=10.
  v_points_to_receive := FLOOR(p_amount::decimal / v_rate::decimal)::INTEGER;
  v_coins_to_deduct := v_points_to_receive * v_rate;

  IF v_points_to_receive < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 'เหรียญไม่พอสำหรับแลก 1 คะแนน (อัตรา ' || v_rate || ' เหรียญ = 1 คะแนน)');
  END IF;

  -- 4. Get Profile & Check Balance
  SELECT id, total_coins INTO v_profile_id, v_current_coins 
  FROM public.profiles 
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบข้อมูลผู้ใช้');
  END IF;

  IF v_current_coins < v_coins_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'message', 'เหรียญสะสมไม่พอ');
  END IF;

  -- 5. Check Daily Limit
  SELECT COALESCE(SUM(amount), 0)::INTEGER INTO v_daily_spent
  FROM public.coins_transactions
  WHERE profile_id = v_profile_id
    AND transaction_type = 'spend'
    AND source = 'exchange_to_points'
    AND DATE(created_at) = CURRENT_DATE;

  IF (v_daily_spent + v_coins_to_deduct) > v_max_daily THEN
    RETURN jsonb_build_object('success', false, 'message', 'เกินโควตาแลกเหรียญต่อวัน (เหลือโควตา ' || (v_max_daily - v_daily_spent) || ' เหรียญ)');
  END IF;

  -- 6. Perform Transaction
  -- Update Profile
  UPDATE public.profiles
  SET 
    total_coins = total_coins - v_coins_to_deduct,
    total_points = total_points + v_points_to_receive,
    updated_at = now()
  WHERE id = v_profile_id;

  -- Log Coin Transaction (Spend)
  INSERT INTO public.coins_transactions (
    profile_id, 
    amount, 
    transaction_type, 
    source, 
    description
  ) VALUES (
    v_profile_id, 
    v_coins_to_deduct, 
    'spend', 
    'exchange_to_points', 
    'แลกเป็น ' || v_points_to_receive || ' คะแนน'
  );

  -- Log Point Transaction (Earn)
  INSERT INTO public.points_transactions (
    profile_id, 
    amount, 
    transaction_type, 
    source, 
    description
  ) VALUES (
    v_profile_id, 
    v_points_to_receive, 
    'earn', 
    'exchange_from_coins', 
    'แลกจาก ' || v_coins_to_deduct || ' เหรียญ'
  );
  
  -- Notification
  INSERT INTO public.notifications (
    profile_id, 
    title, 
    message, 
    type, 
    link
  ) VALUES (
    v_profile_id,
    'แลกคะแนนสำเร็จ!',
    'ใช้ ' || v_coins_to_deduct || ' เหรียญ ได้รับ ' || v_points_to_receive || ' คะแนน',
    'success',
    '/history'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'แลกสำเร็จ! ได้รับ ' || v_points_to_receive || ' คะแนน',
    'points_received', v_points_to_receive,
    'coins_deducted', v_coins_to_deduct
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'เกิดข้อผิดพลาด: ' || SQLERRM);
END;
$$;
CREATE OR REPLACE FUNCTION public.exchange_coins_to_points(p_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  -- Settings variables
  v_is_active BOOLEAN;
  v_min_coins INTEGER;
  v_max_daily INTEGER;
  v_rate INTEGER; -- Coins per 1 Point
  
  -- Calculation variables
  v_points_to_receive INTEGER;
  v_coins_to_deduct INTEGER;
  v_current_coins INTEGER;
  v_daily_spent INTEGER;
  v_profile_id UUID;
BEGIN
  -- 1. Fetch System Settings
  SELECT value::BOOLEAN INTO v_is_active FROM public.system_settings WHERE key = 'exchange_is_active';
  SELECT value::INTEGER INTO v_min_coins FROM public.system_settings WHERE key = 'exchange_min_coins';
  SELECT value::INTEGER INTO v_max_daily FROM public.system_settings WHERE key = 'exchange_max_daily_coins';
  SELECT value::INTEGER INTO v_rate FROM public.system_settings WHERE key = 'coins_per_point';

  -- Set defaults if missing
  IF v_is_active IS NULL THEN v_is_active := true; END IF;
  IF v_min_coins IS NULL THEN v_min_coins := 100; END IF;
  IF v_max_daily IS NULL THEN v_max_daily := 5000; END IF;
  IF v_rate IS NULL OR v_rate <= 0 THEN v_rate := 1; END IF;

  -- 2. System Checks
  IF v_is_active = false THEN
    RETURN jsonb_build_object('success', false, 'message', 'ระบบแลกคะแนนปิดปรับปรุงชั่วคราว');
  END IF;

  IF p_amount < v_min_coins THEN
    RETURN jsonb_build_object('success', false, 'message', 'ต้องแลกขั้นต่ำ ' || v_min_coins || ' เหรียญ');
  END IF;

  -- 3. Calculate Logic (Coins per Point)
  -- Example: Rate=10, Amount=15 -> Points=1, Deduct=10.
  v_points_to_receive := FLOOR(p_amount::decimal / v_rate::decimal)::INTEGER;
  v_coins_to_deduct := v_points_to_receive * v_rate;

  IF v_points_to_receive < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 'เหรียญไม่พอสำหรับแลก 1 คะแนน (อัตรา ' || v_rate || ' เหรียญ = 1 คะแนน)');
  END IF;

  -- 4. Get Profile & Check Balance
  SELECT id, total_coins INTO v_profile_id, v_current_coins 
  FROM public.profiles 
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบข้อมูลผู้ใช้');
  END IF;

  IF v_current_coins < v_coins_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'message', 'เหรียญสะสมไม่พอ');
  END IF;

  -- 5. Check Daily Limit (Only if v_max_daily > 0)
  IF v_max_daily > 0 THEN
    SELECT COALESCE(SUM(amount), 0)::INTEGER INTO v_daily_spent
    FROM public.coins_transactions
    WHERE profile_id = v_profile_id
        AND transaction_type = 'spend'
        AND source = 'exchange_to_points'
        AND DATE(created_at) = CURRENT_DATE;

    IF (v_daily_spent + v_coins_to_deduct) > v_max_daily THEN
        RETURN jsonb_build_object('success', false, 'message', 'เกินโควตาแลกเหรียญต่อวัน (เหลือโควตา ' || (v_max_daily - v_daily_spent) || ' เหรียญ)');
    END IF;
  END IF;

  -- 6. Perform Transaction
  -- Update Profile
  UPDATE public.profiles
  SET 
    total_coins = total_coins - v_coins_to_deduct,
    total_points = total_points + v_points_to_receive,
    updated_at = now()
  WHERE id = v_profile_id;

  -- Log Coin Transaction (Spend)
  INSERT INTO public.coins_transactions (
    profile_id, 
    amount, 
    transaction_type, 
    source, 
    description
  ) VALUES (
    v_profile_id, 
    v_coins_to_deduct, 
    'spend', 
    'exchange_to_points', 
    'แลกเป็น ' || v_points_to_receive || ' คะแนน'
  );

  -- Log Point Transaction (Earn)
  INSERT INTO public.points_transactions (
    profile_id, 
    amount, 
    transaction_type, 
    source, 
    description
  ) VALUES (
    v_profile_id, 
    v_points_to_receive, 
    'earn', 
    'exchange_from_coins', 
    'แลกจาก ' || v_coins_to_deduct || ' เหรียญ'
  );
  
  -- Notification
  INSERT INTO public.notifications (
    profile_id, 
    title, 
    message, 
    type, 
    link
  ) VALUES (
    v_profile_id,
    'แลกคะแนนสำเร็จ!',
    'ใช้ ' || v_coins_to_deduct || ' เหรียญ ได้รับ ' || v_points_to_receive || ' คะแนน',
    'success',
    '/history'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'แลกสำเร็จ! ได้รับ ' || v_points_to_receive || ' คะแนน',
    'points_received', v_points_to_receive,
    'coins_deducted', v_coins_to_deduct
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'เกิดข้อผิดพลาด: ' || SQLERRM);
END;
$$;

-- ========================================
-- WHEEL OF FORTUNE TABLES
-- ========================================

CREATE TABLE public.wheel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL,
  slot_count INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_wheel_configs_updated_at
  BEFORE UPDATE ON public.wheel_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.wheel_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID REFERENCES public.wheel_configs(id) ON DELETE CASCADE NOT NULL,
  slot_index INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'coins', 'points', 'none'
  reward_value INTEGER NOT NULL DEFAULT 0,
  reward_label TEXT NOT NULL,
  reward_color TEXT NOT NULL DEFAULT '#f8fafc',
  weight INTEGER NOT NULL DEFAULT 10,
  limit_quota INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_wheel_rewards_updated_at
  BEFORE UPDATE ON public.wheel_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.wheel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wheel_configs
CREATE POLICY "Anyone can view active wheel configs"
  ON public.wheel_configs FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all wheel configs"
  ON public.wheel_configs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for wheel_rewards
CREATE POLICY "Anyone can view wheel rewards"
  ON public.wheel_rewards FOR SELECT
  TO authenticated
  USING (wheel_id IN (SELECT id FROM public.wheel_configs WHERE is_active = true));

CREATE POLICY "Admins can manage all wheel rewards"
  ON public.wheel_rewards FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default wheel config and rewards
INSERT INTO public.wheel_configs (id, config_name, slot_count, is_active)
VALUES ('e7fdedbf-6a98-4c17-916c-e4e1a6c1bad8', 'Default Daily Wheel', 8, true);

INSERT INTO public.wheel_rewards (wheel_id, slot_index, reward_type, reward_value, reward_label, reward_color, weight)
VALUES
  ('e7fdedbf-6a98-4c17-916c-e4e1a6c1bad8', 1, 'coins', 10, '10 เหรียญ', '#fef08a', 20),
  ('e7fdedbf-6a98-4c17-916c-e4e1a6c1bad8', 2, 'points', 50, '50 คะแนน', '#bfdbfe', 20),
  ('e7fdedbf-6a98-4c17-916c-e4e1a6c1bad8', 3, 'none', 0, 'หมุนใหม่', '#e5e7eb', 10),
  ('e7fdedbf-6a98-4c17-916c-e4e1a6c1bad8', 4, 'points', 100, '100 คะแนน', '#bbf7d0', 10),
  ('e7fdedbf-6a98-4c17-916c-e4e1a6c1bad8', 5, 'none', 0, 'เสียใจด้วย', '#fecaca', 20),
  ('e7fdedbf-6a98-4c17-916c-e4e1a6c1bad8', 6, 'coins', 50, '50 เหรียญ', '#fbcfe8', 10),
  ('e7fdedbf-6a98-4c17-916c-e4e1a6c1bad8', 7, 'points', 500, '500 คะแนน', '#fed7aa', 5),
  ('e7fdedbf-6a98-4c17-916c-e4e1a6c1bad8', 8, 'none', 0, 'ลองอีกครั้ง', '#e5e7eb', 15);

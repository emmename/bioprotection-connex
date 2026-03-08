-- Migration: Create Memory Match Game Tables

-- 1. match_configs Table
CREATE TABLE IF NOT EXISTS public.match_configs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    config_name TEXT NOT NULL DEFAULT 'Default Config',
    coins_cost INTEGER NOT NULL DEFAULT 5,
    free_plays_per_day INTEGER NOT NULL DEFAULT 1,
    reward_type TEXT NOT NULL DEFAULT 'coins', -- 'none', 'coins', 'points'
    reward_value INTEGER NOT NULL DEFAULT 10,
    levels_config JSONB NOT NULL DEFAULT '[
      {"grid": [2, 3], "time": 30},
      {"grid": [2, 4], "time": 45},
      {"grid": [3, 4], "time": 60},
      {"grid": [4, 4], "time": 90}
    ]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Basic RLS
ALTER TABLE public.match_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to active match_configs" 
ON public.match_configs FOR SELECT USING (is_active = true);

-- Add sample config
INSERT INTO public.match_configs (config_name, coins_cost, free_plays_per_day, reward_type, reward_value)
VALUES ('เริ่มต้นซีซั่นใหม่', 5, 2, 'coins', 10)
ON CONFLICT DO NOTHING;

-- 2. match_images Table
CREATE TABLE IF NOT EXISTS public.match_images (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    image_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Basic RLS
ALTER TABLE public.match_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to active match_images" 
ON public.match_images FOR SELECT USING (is_active = true);

-- Enable RLS for admins on both tables
CREATE POLICY "Admins can manage match configs"
ON public.match_configs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage match images"
ON public.match_images FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add Advanced Features to Wheel Game

-- Add custom coins cost and free spins to wheel_configs
ALTER TABLE public.wheel_configs
ADD COLUMN IF NOT EXISTS coins_cost INTEGER DEFAULT 0;

ALTER TABLE public.wheel_configs
ADD COLUMN IF NOT EXISTS free_spins_per_day INTEGER DEFAULT 1;

-- Add image URL to wheel rewards
ALTER TABLE public.wheel_rewards
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

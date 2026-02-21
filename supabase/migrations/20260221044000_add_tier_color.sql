-- Add color column to tier_settings
ALTER TABLE public.tier_settings
ADD COLUMN IF NOT EXISTS color text;

-- Populate existing rows with default colors
UPDATE public.tier_settings SET color = '#b45309' WHERE tier = 'bronze';   -- amber-700
UPDATE public.tier_settings SET color = '#9ca3af' WHERE tier = 'silver';   -- gray-400
UPDATE public.tier_settings SET color = '#eab308' WHERE tier = 'gold';     -- yellow-500
UPDATE public.tier_settings SET color = '#a855f7' WHERE tier = 'platinum'; -- purple-500

-- Make column NOT NULL if preferred, but leaving nullable for backward compatibility is fine.
-- We will just provide a default fallback in the frontend.

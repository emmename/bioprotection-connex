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

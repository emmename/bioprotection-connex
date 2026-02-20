-- Add tier-specific pricing and multiple images columns to rewards table
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
WHERE image_url IS NOT NULL AND (images = '{}' OR images IS NULL);
-- Add category column to rewards table
ALTER TABLE public.rewards 
ADD COLUMN category text DEFAULT 'general';

-- Create an index for faster category filtering
CREATE INDEX idx_rewards_category ON public.rewards(category);

-- Add a comment to document the expected values
COMMENT ON COLUMN public.rewards.category IS 'Category of reward: all, farm-equipment, general, glass, clothing';
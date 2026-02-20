-- Add requirements JSONB column to missions table
-- This stores targeting criteria and reward overrides as JSON
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS requirements JSONB;

COMMENT ON COLUMN public.missions.requirements IS 'JSON object containing targeting criteria (member_types, sub_types, tiers) and reward_overrides';

-- Add requirements JSONB column to content table
-- This stores targeting criteria (member_types, sub_types, tiers) similar to missions
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS requirements JSONB;

COMMENT ON COLUMN public.content.requirements IS 'JSON object containing targeting criteria (member_types, sub_types, tiers)';

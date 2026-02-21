-- Add targeting columns to rewards table
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS target_member_types text[] DEFAULT NULL;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS requirements jsonb DEFAULT NULL;

COMMENT ON COLUMN public.rewards.target_member_types IS 'Array of member type strings that can view this reward';
COMMENT ON COLUMN public.rewards.requirements IS 'JSON object containing targeting criteria (e.g. member_types, sub_types)';

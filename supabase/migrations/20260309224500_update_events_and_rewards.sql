-- Add columns to events table for Event Types, Access Control, and Mission Link
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'general_event',
ADD COLUMN IF NOT EXISTS allowed_member_types text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS allowed_sub_types jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS allowed_tiers text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL DEFAULT NULL;

-- Create table for Dynamic Event Rewards
CREATE TABLE IF NOT EXISTS public.event_rewards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    member_type text,
    tier_name text,
    points_reward integer DEFAULT 0,
    coins_reward integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS for event_rewards
ALTER TABLE public.event_rewards ENABLE ROW LEVEL SECURITY;

-- Policies for event_rewards
DROP POLICY IF EXISTS "Public read for event_rewards" ON public.event_rewards;
CREATE POLICY "Public read for event_rewards"
    ON public.event_rewards
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin full access event_rewards" ON public.event_rewards;
CREATE POLICY "Admin full access event_rewards"
    ON public.event_rewards
    FOR ALL
    USING (public.has_permission(auth.uid(), 'manage_events'));

-- Add updated_at trigger for event_rewards
DROP TRIGGER IF EXISTS update_event_rewards_updated_at ON public.event_rewards;
CREATE TRIGGER update_event_rewards_updated_at
    BEFORE UPDATE ON public.event_rewards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

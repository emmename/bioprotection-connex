-- Add allowed_sub_types to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS allowed_sub_types jsonb DEFAULT '{}'::jsonb;

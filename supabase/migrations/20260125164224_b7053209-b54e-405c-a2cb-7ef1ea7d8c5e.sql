-- Add DELETE policy for admins on profiles table
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add ON DELETE CASCADE to related tables if not already set
ALTER TABLE public.farm_details 
DROP CONSTRAINT IF EXISTS farm_details_profile_id_fkey,
ADD CONSTRAINT farm_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.company_details 
DROP CONSTRAINT IF EXISTS company_details_profile_id_fkey,
ADD CONSTRAINT company_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.vet_details 
DROP CONSTRAINT IF EXISTS vet_details_profile_id_fkey,
ADD CONSTRAINT vet_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.shop_details 
DROP CONSTRAINT IF EXISTS shop_details_profile_id_fkey,
ADD CONSTRAINT shop_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.government_details 
DROP CONSTRAINT IF EXISTS government_details_profile_id_fkey,
ADD CONSTRAINT government_details_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.daily_checkins 
DROP CONSTRAINT IF EXISTS daily_checkins_profile_id_fkey,
ADD CONSTRAINT daily_checkins_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.points_transactions 
DROP CONSTRAINT IF EXISTS points_transactions_profile_id_fkey,
ADD CONSTRAINT points_transactions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coins_transactions 
DROP CONSTRAINT IF EXISTS coins_transactions_profile_id_fkey,
ADD CONSTRAINT coins_transactions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.receipts 
DROP CONSTRAINT IF EXISTS receipts_profile_id_fkey,
ADD CONSTRAINT receipts_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reward_redemptions 
DROP CONSTRAINT IF EXISTS reward_redemptions_profile_id_fkey,
ADD CONSTRAINT reward_redemptions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.content_progress 
DROP CONSTRAINT IF EXISTS content_progress_profile_id_fkey,
ADD CONSTRAINT content_progress_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.game_sessions 
DROP CONSTRAINT IF EXISTS game_sessions_profile_id_fkey,
ADD CONSTRAINT game_sessions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.mission_completions 
DROP CONSTRAINT IF EXISTS mission_completions_profile_id_fkey,
ADD CONSTRAINT mission_completions_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
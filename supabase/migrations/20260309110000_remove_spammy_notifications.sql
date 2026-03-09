-- Drop triggers that spam notifications for every points/coins earned
DROP TRIGGER IF EXISTS on_points_earned ON public.points_transactions;
DROP TRIGGER IF EXISTS on_coins_earned ON public.coins_transactions;

-- Optionally, drop the functions as well if they are no longer used
-- DROP FUNCTION IF EXISTS public.notify_points_earned();
-- DROP FUNCTION IF EXISTS public.notify_coins_earned();

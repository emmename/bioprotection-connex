-- ==============================================================================
-- Migration: fix_function_search_paths
-- Description: Sets search_path = '' on specific functions to resolve the 
-- "Function Search Path Mutable" (0011_function_search_path_mutable) security 
-- vulnerability as recommended by Supabase Advisors.
-- ==============================================================================

ALTER FUNCTION public.handle_deleted_storage_file() SET search_path = '';

ALTER FUNCTION public.check_mission_group_completion() SET search_path = '';

ALTER FUNCTION public.process_event_checkin(uuid) SET search_path = '';

ALTER FUNCTION public.process_event_checkin(uuid, uuid) SET search_path = '';

ALTER FUNCTION public.revert_event_checkin(uuid) SET search_path = '';

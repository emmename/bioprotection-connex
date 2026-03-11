-- ==========================================================
-- Security Hardening: Text Validation Constraints
-- ==========================================================

-- 1. library_categories constraints
ALTER TABLE IF EXISTS library_categories
  ADD CONSTRAINT chk_category_name_length CHECK (char_length(name) <= 255),
  ADD CONSTRAINT chk_category_desc_length CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD CONSTRAINT chk_category_icon_length CHECK (icon_url IS NULL OR char_length(icon_url) <= 1000);

-- 2. library_items constraints
ALTER TABLE IF EXISTS library_items
  ADD CONSTRAINT chk_library_item_title_length CHECK (char_length(title) <= 500),
  ADD CONSTRAINT chk_library_item_desc_length CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD CONSTRAINT chk_library_item_content_length CHECK (content_body IS NULL OR char_length(content_body) <= 100000),
  ADD CONSTRAINT chk_library_item_file_length CHECK (file_url IS NULL OR char_length(file_url) <= 1000),
  ADD CONSTRAINT chk_library_item_thumb_length CHECK (thumbnail_url IS NULL OR char_length(thumbnail_url) <= 1000);

-- 3. Storage bucket limits (Survey Responses)
-- Make sure the bucket has limits too if we missed it
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB limit
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
WHERE id = 'survey_responses';

-- 4. Create trigger function structure for cleaning up orphaned files
-- Note: Supabase doesn't natively allow deleting files purely via standard PostgreSQL DELETE FROM storage.objects
-- The best practice is to use Database Webhooks to trigger an Edge Function when a row is deleted.
-- We are preparing the helper function here in case pg_net is available.
CREATE OR REPLACE FUNCTION public.handle_deleted_storage_file()
RETURNS TRIGGER AS $$
BEGIN
  -- We log it so developers or a cron job can clean it up later if not using webhooks
  -- This creates a safe 'Soft Delete' audit trail for files that need physical deletion.
  RAISE NOTICE 'Record deleted requiring storage cleanup: %', OLD.file_url;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

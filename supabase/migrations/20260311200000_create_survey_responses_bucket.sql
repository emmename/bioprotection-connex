-- Create storage bucket for survey responses with Size & Mime limits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'survey_responses', 
    'survey_responses', 
    true, 
    5242880,
    '{image/jpeg,image/png,image/gif,image/webp}'::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
    file_size_limit = 5242880,
    allowed_mime_types = '{image/jpeg,image/png,image/gif,image/webp}'::text[];

-- Drop existing policies to recreate them securely
DROP POLICY IF EXISTS "Public can upload survey responses" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload survey responses" ON storage.objects;
DROP POLICY IF EXISTS "Public can read survey responses" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage survey responses" ON storage.objects;

-- Allow anyone to upload images to the bucket
CREATE POLICY "Public can upload survey responses"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'survey_responses');

-- Allow public read access (Required for getPublicUrl to work)
CREATE POLICY "Public can read survey responses"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'survey_responses');

-- Allow authenticated users (admins) to manage survey responses
CREATE POLICY "Admins can manage survey responses"
ON storage.objects FOR ALL TO authenticated
USING (
    bucket_id = 'survey_responses'
    AND public.has_role(auth.uid(), 'admin')
);

-- Create storage bucket for survey responses if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('survey_responses', 'survey_responses', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload images to the survey_responses bucket
CREATE POLICY "Public can upload survey responses"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'survey_responses');

-- Allow authenticated users to upload images as well (just in case)
CREATE POLICY "Authenticated users can upload survey responses"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'survey_responses');

-- Allow public read access (required for getPublicUrl to work)
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

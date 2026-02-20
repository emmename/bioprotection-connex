-- Create the 'content-thumbnails' bucket for storing content images
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-thumbnails', 'content-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow public access to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'content-thumbnails' );

-- Allow authenticated users (e.g., admins) to upload images
CREATE POLICY "Authenticated Users Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'content-thumbnails' );

-- Allow authenticated users to update their own images (or generally update in this bucket)
CREATE POLICY "Authenticated Users Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'content-thumbnails' );

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated Users Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'content-thumbnails' );

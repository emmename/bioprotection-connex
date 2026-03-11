-- ==========================================================
-- Security Fixes for Library and Storage Buckets
-- ==========================================================

-- 1. Fix library_categories policies
-- Drop the insecure policies
DROP POLICY IF EXISTS "Admins can insert categories" ON library_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON library_categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON library_categories;

-- Create secure policies to ensure only admins can manage categories
CREATE POLICY "Admins can insert categories"
  ON library_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
  ON library_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
  ON library_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- 2. Fix library_items policies
-- Drop the insecure policies
DROP POLICY IF EXISTS "Admins can insert items" ON library_items;
DROP POLICY IF EXISTS "Admins can update items" ON library_items;
DROP POLICY IF EXISTS "Admins can delete items" ON library_items;

-- Create secure policies to ensure only admins can manage items
CREATE POLICY "Admins can insert items"
  ON library_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update items"
  ON library_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete items"
  ON library_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- 3. Fix library storage bucket (Limits and Policies)
-- Add limits to protect from large files or invalid formats
UPDATE storage.buckets
SET file_size_limit = 20971520, -- 20MB max file size for PDFs, videos, images
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm']::text[]
WHERE id = 'library';

-- Drop the insecure bucket policies
DROP POLICY IF EXISTS "Authenticated users can upload library files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update library files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete library files" ON storage.objects;

-- Create secure bucket policies for admins
CREATE POLICY "Admins can upload library files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'library'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update library files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'library'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete library files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'library'
    AND public.has_role(auth.uid(), 'admin')
  );


-- 4. Fix content-thumbnails storage bucket (Limits and Policies)
-- Add limits to protect against large thumbnails
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB limit for images
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
WHERE id = 'content-thumbnails';

-- Drop the insecure bucket policies
DROP POLICY IF EXISTS "Authenticated Users Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete" ON storage.objects;

-- Create secure bucket policies for thumbnails
CREATE POLICY "Admins can upload content thumbnails"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'content-thumbnails'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update content thumbnails"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'content-thumbnails'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete content thumbnails"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'content-thumbnails'
    AND public.has_role(auth.uid(), 'admin')
  );


-- 5. Fix game-assets storage bucket limits
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB limit
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'application/json']::text[]
WHERE id = 'game-assets';

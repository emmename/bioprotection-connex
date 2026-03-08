-- Create storage bucket for game assets (match card images, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-assets', 'game-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (admins) to upload
CREATE POLICY "Admins can upload game assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'game-assets'
    AND public.has_role(auth.uid(), 'admin')
);

-- Allow authenticated users (admins) to update/delete
CREATE POLICY "Admins can manage game assets"
ON storage.objects FOR ALL TO authenticated
USING (
    bucket_id = 'game-assets'
    AND public.has_role(auth.uid(), 'admin')
);

-- Allow public read access
CREATE POLICY "Public can read game assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'game-assets');

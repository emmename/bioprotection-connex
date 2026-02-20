-- Create storage bucket for reward images
INSERT INTO storage.buckets (id, name, public)
VALUES ('reward-images', 'reward-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for reward images
CREATE POLICY "Anyone can view reward images"
ON storage.objects FOR SELECT
USING (bucket_id = 'reward-images');

CREATE POLICY "Admins can upload reward images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reward-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reward images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reward-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reward images"
ON storage.objects FOR DELETE
USING (bucket_id = 'reward-images' AND has_role(auth.uid(), 'admin'));
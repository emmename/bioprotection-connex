-- Create storage policies for content images in receipts bucket

-- Allow authenticated users to upload files to the articles folder
CREATE POLICY "Allow authenticated users to upload article images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = 'articles'
);

-- Allow public read access to article images
CREATE POLICY "Allow public to view article images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = 'articles'
);

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Allow authenticated users to upload thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = 'thumbnails'
);

-- Allow public read access to thumbnails
CREATE POLICY "Allow public to view thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = 'thumbnails'
);
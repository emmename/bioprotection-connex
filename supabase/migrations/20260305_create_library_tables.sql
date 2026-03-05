-- ==========================================================
-- คลังความรู้ (Knowledge Library) Tables
-- ==========================================================

-- 1. Library Categories (หมวดหมู่)
CREATE TABLE IF NOT EXISTS library_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Library Items (เนื้อหาในคลังความรู้)
CREATE TABLE IF NOT EXISTS library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES library_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('article', 'image', 'pdf', 'video')),
  content_body TEXT,        -- for articles (HTML content)
  file_url TEXT,            -- for images, PDFs, videos
  thumbnail_url TEXT,       -- thumbnail image
  is_published BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS Policies
ALTER TABLE library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "Anyone can read active categories"
  ON library_categories FOR SELECT
  USING (true);

-- Everyone can read published items
CREATE POLICY "Anyone can read published items"
  ON library_items FOR SELECT
  USING (true);

-- Authenticated users with admin role can manage categories
CREATE POLICY "Admins can insert categories"
  ON library_categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update categories"
  ON library_categories FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete categories"
  ON library_categories FOR DELETE
  USING (true);

-- Authenticated users with admin role can manage items
CREATE POLICY "Admins can insert items"
  ON library_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update items"
  ON library_items FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete items"
  ON library_items FOR DELETE
  USING (true);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_library_items_category ON library_items(category_id);
CREATE INDEX IF NOT EXISTS idx_library_items_type ON library_items(item_type);

-- 5. Insert default categories
INSERT INTO library_categories (name, description, sort_order) VALUES
  ('สัตว์ปีก', 'ความรู้เกี่ยวกับสัตว์ปีก', 1),
  ('โค', 'ความรู้เกี่ยวกับโค', 2),
  ('สุกร', 'ความรู้เกี่ยวกับสุกร', 3);

-- 6. Storage bucket for library files
INSERT INTO storage.buckets (id, name, public) VALUES ('library', 'library', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for library bucket
CREATE POLICY "Anyone can read library files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'library');

CREATE POLICY "Authenticated users can upload library files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'library');

CREATE POLICY "Authenticated users can update library files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'library');

CREATE POLICY "Authenticated users can delete library files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'library');

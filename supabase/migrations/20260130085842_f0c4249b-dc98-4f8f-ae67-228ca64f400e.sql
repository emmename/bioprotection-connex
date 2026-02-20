-- Create reward_categories table
CREATE TABLE public.reward_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT 'tag',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reward_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active categories" 
ON public.reward_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all categories" 
ON public.reward_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_reward_categories_updated_at
BEFORE UPDATE ON public.reward_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default categories
INSERT INTO public.reward_categories (name, slug, icon, sort_order) VALUES
('อุปกรณ์ในฟาร์ม', 'farm-equipment', 'tractor', 1),
('ของใช้ทั่วไป', 'general', 'package', 2),
('แก้วน้ำ', 'glass', 'glass-water', 3),
('เครื่องแต่งกาย', 'clothing', 'shirt', 4);

-- Create index for faster queries
CREATE INDEX idx_reward_categories_slug ON public.reward_categories(slug);
CREATE INDEX idx_reward_categories_sort_order ON public.reward_categories(sort_order);
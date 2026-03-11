/*
  Add target_member_types and target_tiers to library_items table
*/

ALTER TABLE IF EXISTS library_items
ADD COLUMN IF NOT EXISTS target_member_types text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS target_tiers text[] DEFAULT NULL;

/*
  # Add Variant Badge and Recommendation Features
  
  1. Changes
    - Add `is_recommended` boolean column to product_variants
    - Add `badge_text` text column for variant badges (e.g., "HIGH SELLING", "POPULAR")
    - Set default values for existing data
  
  2. Notes
    - is_recommended defaults to false
    - badge_text is optional (can be null)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_variants' AND column_name = 'is_recommended'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN is_recommended boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_variants' AND column_name = 'badge_text'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN badge_text text DEFAULT NULL;
  END IF;
END $$;

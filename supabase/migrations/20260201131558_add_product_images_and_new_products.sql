/*
  # Add Product Images and New Products

  ## Changes
  1. Add image_url column to products table
  2. Update existing products with image URLs
  3. Add new products: IGF-1 LR3 and HGH 191AA with variants
  
  ## New Products
  - IGF-1 LR3 (Insulin-like Growth Factor)
  - HGH 191AA (Human Growth Hormone)
*/

-- Add image_url column to products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text DEFAULT '';
  END IF;
END $$;

-- Update existing products with image URLs
UPDATE products SET image_url = '/retatrutide.jpg' WHERE name = 'Retatrutide';
UPDATE products SET image_url = '/tirzepatide.jpg' WHERE name = 'Tirzepatide';
UPDATE products SET image_url = '/ghk-cu.jpg' WHERE name = 'GHK-Cu';

-- Insert new products
INSERT INTO products (name, description, category, image_url) VALUES
  ('IGF-1 LR3', 'Insulin-like growth factor for cellular research applications', 'peptide', '/igf-1-lr3.jpg'),
  ('HGH 191AA', 'Human growth hormone (Somatropin) for laboratory analysis', 'peptide', '/hgh-191aa.jpg')
ON CONFLICT DO NOTHING;

-- Insert variants for IGF-1 LR3
INSERT INTO product_variants (product_id, dosage_mg, price_inr)
SELECT 
  (SELECT id FROM products WHERE name = 'IGF-1 LR3'),
  dosage,
  price
FROM (VALUES 
  (1, 5000),
  (5, 20000),
  (10, 35000)
) AS variants(dosage, price)
ON CONFLICT DO NOTHING;

-- Insert variants for HGH 191AA
INSERT INTO product_variants (product_id, dosage_mg, price_inr)
SELECT 
  (SELECT id FROM products WHERE name = 'HGH 191AA'),
  dosage,
  price
FROM (VALUES 
  (50, 7000),   -- 10IU x 5 vials
  (100, 11000), -- 10IU x 10 vials
  (120, 13000), -- 24IU x 5 vials
  (240, 18000)  -- 24IU x 10 vials
) AS variants(dosage, price)
ON CONFLICT DO NOTHING;
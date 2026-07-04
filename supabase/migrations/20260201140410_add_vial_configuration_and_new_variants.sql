/*
  # Add Vial Configuration and New Dosage Variants

  1. Changes
    - Add vial_configuration column to product_variants table
    - Add 20mg, 50mg, and 100mg variants for Retatrutide
    - Add 20mg, 50mg, and 100mg variants for Tirzepatide
  
  2. Notes
    - 20mg = Single vial
    - 50mg = 10mg × 5 vials
    - 100mg = 10mg × 10 vials OR 20mg × 5 vials (depending on availability)
*/

-- Add vial_configuration column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_variants' AND column_name = 'vial_configuration'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN vial_configuration text;
  END IF;
END $$;

-- Add new variants for Retatrutide
INSERT INTO product_variants (product_id, dosage_mg, price_inr, in_stock, vial_configuration)
SELECT 
  id,
  20,
  22000,
  true,
  'Single vial'
FROM products
WHERE name = 'Retatrutide'
AND NOT EXISTS (
  SELECT 1 FROM product_variants pv 
  WHERE pv.product_id = products.id AND pv.dosage_mg = 20
);

INSERT INTO product_variants (product_id, dosage_mg, price_inr, in_stock, vial_configuration)
SELECT 
  id,
  50,
  55000,
  true,
  '10mg × 5 vials'
FROM products
WHERE name = 'Retatrutide'
AND NOT EXISTS (
  SELECT 1 FROM product_variants pv 
  WHERE pv.product_id = products.id AND pv.dosage_mg = 50
);

INSERT INTO product_variants (product_id, dosage_mg, price_inr, in_stock, vial_configuration)
SELECT 
  id,
  100,
  110000,
  true,
  '10mg × 10 vials / 20mg × 5 vials'
FROM products
WHERE name = 'Retatrutide'
AND NOT EXISTS (
  SELECT 1 FROM product_variants pv 
  WHERE pv.product_id = products.id AND pv.dosage_mg = 100
);

-- Add new variants for Tirzepatide
INSERT INTO product_variants (product_id, dosage_mg, price_inr, in_stock, vial_configuration)
SELECT 
  id,
  20,
  18000,
  true,
  'Single vial'
FROM products
WHERE name = 'Tirzepatide'
AND NOT EXISTS (
  SELECT 1 FROM product_variants pv 
  WHERE pv.product_id = products.id AND pv.dosage_mg = 20
);

INSERT INTO product_variants (product_id, dosage_mg, price_inr, in_stock, vial_configuration)
SELECT 
  id,
  50,
  45000,
  true,
  '10mg × 5 vials'
FROM products
WHERE name = 'Tirzepatide'
AND NOT EXISTS (
  SELECT 1 FROM product_variants pv 
  WHERE pv.product_id = products.id AND pv.dosage_mg = 50
);

INSERT INTO product_variants (product_id, dosage_mg, price_inr, in_stock, vial_configuration)
SELECT 
  id,
  100,
  90000,
  true,
  '10mg × 10 vials / 20mg × 5 vials'
FROM products
WHERE name = 'Tirzepatide'
AND NOT EXISTS (
  SELECT 1 FROM product_variants pv 
  WHERE pv.product_id = products.id AND pv.dosage_mg = 100
);
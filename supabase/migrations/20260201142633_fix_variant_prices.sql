/*
  # Fix Variant Prices

  1. Changes
    - Update Retatrutide prices: 20mg=7K, 50mg=13K, 100mg=21K
    - Update Tirzepatide prices: 20mg=6K, 50mg=11K, 100mg=18K
*/

-- Update Retatrutide prices
UPDATE product_variants
SET price_inr = 7000
WHERE product_id = (SELECT id FROM products WHERE name = 'Retatrutide')
  AND dosage_mg = 20;

UPDATE product_variants
SET price_inr = 13000
WHERE product_id = (SELECT id FROM products WHERE name = 'Retatrutide')
  AND dosage_mg = 50;

UPDATE product_variants
SET price_inr = 21000
WHERE product_id = (SELECT id FROM products WHERE name = 'Retatrutide')
  AND dosage_mg = 100;

-- Update Tirzepatide prices
UPDATE product_variants
SET price_inr = 6000
WHERE product_id = (SELECT id FROM products WHERE name = 'Tirzepatide')
  AND dosage_mg = 20;

UPDATE product_variants
SET price_inr = 11000
WHERE product_id = (SELECT id FROM products WHERE name = 'Tirzepatide')
  AND dosage_mg = 50;

UPDATE product_variants
SET price_inr = 18000
WHERE product_id = (SELECT id FROM products WHERE name = 'Tirzepatide')
  AND dosage_mg = 100;
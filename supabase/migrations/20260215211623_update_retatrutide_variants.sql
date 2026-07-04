/*
  # Update Retatrutide Product Variants
  
  1. New Variant
    - Add 10mg single vial for ₹4,000
  
  2. Updates
    - Update 100mg variant price from ₹21,000 to ₹20,000
    - Mark 50mg variant as recommended with "HIGH SELLING" badge
  
  3. Notes
    - Retatrutide product_id: 31e3a9d0-de84-45b6-9065-b26d53523575
*/

-- Add new 10mg single vial variant for Retatrutide
INSERT INTO product_variants (product_id, dosage_mg, vial_configuration, price_inr, in_stock, is_recommended)
VALUES (
  '31e3a9d0-de84-45b6-9065-b26d53523575',
  10,
  'Single vial',
  4000,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Update 100mg variant price from 21,000 to 20,000
UPDATE product_variants
SET price_inr = 20000
WHERE product_id = '31e3a9d0-de84-45b6-9065-b26d53523575'
  AND dosage_mg = 100;

-- Mark 50mg variant as recommended with HIGH SELLING badge
UPDATE product_variants
SET is_recommended = true,
    badge_text = 'HIGH SELLING'
WHERE product_id = '31e3a9d0-de84-45b6-9065-b26d53523575'
  AND dosage_mg = 50;

/*
  # Update Vial Configurations and Prices

  1. Changes
    - Update vial_configuration for all new variants
    - Update prices to appropriate values
    - Ensure all variants have proper configuration text
*/

-- Update Retatrutide 20mg
UPDATE product_variants
SET 
  vial_configuration = 'Single vial',
  price_inr = 22000
WHERE product_id = (SELECT id FROM products WHERE name = 'Retatrutide')
  AND dosage_mg = 20;

-- Update Retatrutide 50mg
UPDATE product_variants
SET 
  vial_configuration = '10mg × 5 vials',
  price_inr = 55000
WHERE product_id = (SELECT id FROM products WHERE name = 'Retatrutide')
  AND dosage_mg = 50;

-- Update Retatrutide 100mg
UPDATE product_variants
SET 
  vial_configuration = '10mg × 10 vials / 20mg × 5 vials',
  price_inr = 110000
WHERE product_id = (SELECT id FROM products WHERE name = 'Retatrutide')
  AND dosage_mg = 100;

-- Update Tirzepatide 20mg
UPDATE product_variants
SET 
  vial_configuration = 'Single vial',
  price_inr = 18000
WHERE product_id = (SELECT id FROM products WHERE name = 'Tirzepatide')
  AND dosage_mg = 20;

-- Update Tirzepatide 50mg
UPDATE product_variants
SET 
  vial_configuration = '10mg × 5 vials',
  price_inr = 45000
WHERE product_id = (SELECT id FROM products WHERE name = 'Tirzepatide')
  AND dosage_mg = 50;

-- Update Tirzepatide 100mg
UPDATE product_variants
SET 
  vial_configuration = '10mg × 10 vials / 20mg × 5 vials',
  price_inr = 90000
WHERE product_id = (SELECT id FROM products WHERE name = 'Tirzepatide')
  AND dosage_mg = 100;
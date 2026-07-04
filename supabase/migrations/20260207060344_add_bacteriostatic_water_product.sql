/*
  # Add Bacteriostatic Water Product

  ## Overview
  Adds Bacteriostatic Water (Pharma grade) to the product catalogue with multiple dosage options.

  ## Changes
  
  ### New Product
  - Name: Bacteriostatic Water (Pharma Grade)
  - Category: Medical Supplies
  - Description: High-quality bacteriostatic water for medical use
  
  ### Product Variants
  1. 10ML Single - ₹400
  2. 20ML (2×10ML) - ₹600
  3. 50ML (5×10ML) - ₹800
  4. 100ML (10×10ML) - ₹1500

  ## Schema Notes
  - Using dosage_mg field to store ML volume (10, 20, 50, 100)
  - Using vial_configuration field to describe packaging (e.g., "2×10ML")
  - Price stored in price_inr as integer (rupees)

  ## Security
  - All tables already have proper RLS policies in place
  - No policy changes needed for this data insertion
*/

-- ============================================================================
-- STEP 1: Insert the Bacteriostatic Water product
-- ============================================================================

INSERT INTO products (name, description, category, image_url)
VALUES (
  'Bacteriostatic Water (Pharma Grade)',
  'High-quality pharmaceutical grade bacteriostatic water. Sterile water containing 0.9% benzyl alcohol, used for reconstituting and diluting medications for injection. Ensures product safety and extends shelf life after reconstitution.',
  'Medical Supplies',
  '/bac-water.png'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: Add product variants with different dosage options
-- ============================================================================

INSERT INTO product_variants (product_id, dosage_mg, vial_configuration, price_inr, in_stock)
SELECT 
  p.id,
  10,
  '1×10ML',
  400,
  true
FROM products p
WHERE p.name = 'Bacteriostatic Water (Pharma Grade)'
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, dosage_mg, vial_configuration, price_inr, in_stock)
SELECT 
  p.id,
  20,
  '2×10ML',
  600,
  true
FROM products p
WHERE p.name = 'Bacteriostatic Water (Pharma Grade)'
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, dosage_mg, vial_configuration, price_inr, in_stock)
SELECT 
  p.id,
  50,
  '5×10ML',
  800,
  true
FROM products p
WHERE p.name = 'Bacteriostatic Water (Pharma Grade)'
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, dosage_mg, vial_configuration, price_inr, in_stock)
SELECT 
  p.id,
  100,
  '10×10ML',
  1500,
  true
FROM products p
WHERE p.name = 'Bacteriostatic Water (Pharma Grade)'
ON CONFLICT DO NOTHING;
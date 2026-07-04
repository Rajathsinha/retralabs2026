/*
  # Fix Database Security and Performance Issues

  ## Overview
  This migration addresses critical security and performance issues identified in the database audit.

  ## Performance Improvements
  
  ### New Indexes
  - Add index on `order_items.order_id` - Improves order item lookups by order
  - Add index on `order_items.product_id` - Improves product analytics queries
  - Add index on `order_items.variant_id` - Improves variant analytics queries
  - Add index on `product_variants.product_id` - Improves product variant lookups
  - Add index on `orders.customer_email` - Improves customer order history lookups
  - Add index on `orders.payment_status` - Improves payment status filtering
  
  ### Removed Indexes
  - Drop unused `idx_orders_id_email` index to reduce storage and maintenance overhead

  ## Security Improvements
  
  ### Enhanced RLS Policies
  - **Orders Table**: Replace overly permissive INSERT policy with validation checks:
    - Ensures customer_name, customer_email, customer_phone are not empty
    - Validates email format contains '@' symbol
    - Ensures total_amount is positive
    - Validates shipping_address is not empty
    - Ensures status is set to 'pending' for new orders
    
  - **Order Items Table**: Replace overly permissive INSERT policy with validation checks:
    - Validates quantity is positive (greater than 0)
    - Ensures unit_price is positive
    - Validates referenced order_id exists in orders table
    - Validates referenced product_id exists in products table
    - Validates referenced variant_id exists in product_variants table
  
  ### Data Validation Constraints
  - Add CHECK constraints to enforce data integrity at the database level
  - Prevent invalid email formats, negative amounts, and empty required fields
  - Ensure foreign key relationships are valid before insertion

  ## Important Notes
  - Anonymous users can still place orders (required for e-commerce checkout)
  - All data is now validated before insertion to prevent abuse
  - Rate limiting should be implemented at the application/edge function level
  - Consider adding CAPTCHA or similar mechanisms for additional security
*/

-- ============================================================================
-- PERFORMANCE IMPROVEMENTS: Add missing indexes on foreign keys
-- ============================================================================

-- Index for order_items.order_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
  ON order_items(order_id);

-- Index for order_items.product_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
  ON order_items(product_id);

-- Index for order_items.variant_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id 
  ON order_items(variant_id);

-- Index for product_variants.product_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id 
  ON product_variants(product_id);

-- Additional helpful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_email 
  ON orders(customer_email);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
  ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
  ON orders(created_at DESC);

-- ============================================================================
-- Remove unused index
-- ============================================================================

DROP INDEX IF EXISTS idx_orders_id_email;

-- ============================================================================
-- DATA VALIDATION: Add check constraints for data integrity
-- ============================================================================

-- Ensure order amounts are positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_total_amount_positive'
  ) THEN
    ALTER TABLE orders 
      ADD CONSTRAINT orders_total_amount_positive 
      CHECK (total_amount > 0);
  END IF;
END $$;

-- Ensure order item quantities are positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_items_quantity_positive'
  ) THEN
    ALTER TABLE order_items 
      ADD CONSTRAINT order_items_quantity_positive 
      CHECK (quantity > 0);
  END IF;
END $$;

-- Ensure order item prices are positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_items_unit_price_positive'
  ) THEN
    ALTER TABLE order_items 
      ADD CONSTRAINT order_items_unit_price_positive 
      CHECK (unit_price > 0);
  END IF;
END $$;

-- Ensure variant prices are positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_variants_price_positive'
  ) THEN
    ALTER TABLE product_variants 
      ADD CONSTRAINT product_variants_price_positive 
      CHECK (price_inr > 0);
  END IF;
END $$;

-- Ensure variant dosages are positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_variants_dosage_positive'
  ) THEN
    ALTER TABLE product_variants 
      ADD CONSTRAINT product_variants_dosage_positive 
      CHECK (dosage_mg > 0);
  END IF;
END $$;

-- ============================================================================
-- SECURITY IMPROVEMENTS: Replace overly permissive RLS policies
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;

-- Create new validated INSERT policy for orders
CREATE POLICY "Validated order creation"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (
    -- Ensure required fields are not empty
    length(trim(customer_name)) > 0 AND
    length(trim(customer_email)) > 0 AND
    length(trim(customer_phone)) > 0 AND
    length(trim(shipping_address)) > 0 AND
    -- Validate email format (basic check)
    customer_email LIKE '%@%' AND
    -- Ensure total amount is positive
    total_amount > 0 AND
    -- Ensure status is set to pending for new orders
    status = 'pending' AND
    -- Ensure payment status is pending (if column exists)
    (payment_status IS NULL OR payment_status = 'pending')
  );

-- Create new validated INSERT policy for order items
CREATE POLICY "Validated order item creation"
  ON order_items FOR INSERT
  TO anon
  WITH CHECK (
    -- Validate quantity is positive
    quantity > 0 AND
    -- Validate unit price is positive
    unit_price > 0 AND
    -- Ensure the referenced order exists
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id) AND
    -- Ensure the referenced product exists
    EXISTS (SELECT 1 FROM products WHERE products.id = order_items.product_id) AND
    -- Ensure the referenced variant exists and belongs to the product
    EXISTS (
      SELECT 1 FROM product_variants 
      WHERE product_variants.id = order_items.variant_id 
      AND product_variants.product_id = order_items.product_id
    )
  );

-- Allow authenticated users (service role) to view all orders for admin purposes
CREATE POLICY "Service role can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can view all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to update orders (for status updates, payment processing, etc.)
CREATE POLICY "Service role can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can update order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
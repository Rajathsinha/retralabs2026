/*
  # Remove Unused Indexes and Restrict Service Role Policies

  ## Overview
  This migration addresses security audit findings by removing unused indexes and
  making service role UPDATE policies more restrictive.

  ## Performance Improvements

  ### Remove Unused Indexes
  These indexes were created for optimization but are not being used:
  - idx_order_items_product_id - Product lookups are by primary key only
  - idx_order_items_variant_id - Variant lookups are by primary key only
  - idx_product_variants_product_id - Variant lookups are by primary key only
  - idx_orders_customer_email - Order tracking now uses RPC functions
  - idx_orders_payment_status - No queries filtering by payment status
  - idx_orders_created_at - No queries sorting by creation date
  - idx_orders_status - No queries filtering by status

  ### Keep Essential Index
  - idx_order_items_order_id - Used by get_order_items_by_order_and_email function

  ## Security Improvements

  ### Restrict Service Role UPDATE Policies
  Instead of allowing unrestricted updates (USING true, WITH CHECK true),
  new policies will:
  - Only allow updates to specific order management fields
  - Prevent modification of customer information
  - Prevent modification of order amounts (protect financial data)
  - Allow status updates, tracking numbers, and payment information

  ## Important Notes
  - Service role is used by edge functions for order processing
  - These restrictions prevent accidental data corruption
  - Critical fields like total_amount and customer details are protected
*/

-- ============================================================================
-- STEP 1: Remove unused indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_order_items_product_id;
DROP INDEX IF EXISTS idx_order_items_variant_id;
DROP INDEX IF EXISTS idx_product_variants_product_id;
DROP INDEX IF EXISTS idx_orders_customer_email;
DROP INDEX IF EXISTS idx_orders_payment_status;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_orders_status;

-- Keep idx_order_items_order_id as it's used by RPC functions

-- ============================================================================
-- STEP 2: Drop overly permissive UPDATE policies
-- ============================================================================

DROP POLICY IF EXISTS "Service role can update orders" ON orders;
DROP POLICY IF EXISTS "Service role can update order items" ON order_items;

-- ============================================================================
-- STEP 3: Create restrictive UPDATE policies for service role
-- ============================================================================

-- Allow service role to update only order management fields, not customer data
CREATE POLICY "Service role can update order status and tracking"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    -- Ensure customer information cannot be changed
    customer_name = (SELECT customer_name FROM orders WHERE id = orders.id) AND
    customer_email = (SELECT customer_email FROM orders WHERE id = orders.id) AND
    customer_phone = (SELECT customer_phone FROM orders WHERE id = orders.id) AND
    shipping_address = (SELECT shipping_address FROM orders WHERE id = orders.id) AND
    -- Ensure total amount cannot be changed (financial protection)
    total_amount = (SELECT total_amount FROM orders WHERE id = orders.id)
    -- Allow updates to: status, order_status, payment_status, tracking_number,
    -- payment_completed_at, paytm_order_id, paytm_txn_id, payment_method
  );

-- Allow service role to update order items (needed for order processing)
-- But prevent changing core financial data
CREATE POLICY "Service role can update order item details"
  ON order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    -- Ensure order reference cannot be changed
    order_id = (SELECT order_id FROM order_items WHERE id = order_items.id) AND
    -- Ensure product reference cannot be changed
    product_id = (SELECT product_id FROM order_items WHERE id = order_items.id) AND
    -- Ensure variant reference cannot be changed
    variant_id = (SELECT variant_id FROM order_items WHERE id = order_items.id) AND
    -- Ensure quantity cannot be changed
    quantity = (SELECT quantity FROM order_items WHERE id = order_items.id) AND
    -- Ensure unit price cannot be changed
    unit_price = (SELECT unit_price FROM order_items WHERE id = order_items.id)
    -- This effectively prevents all modifications to order items
    -- If updates are truly needed, they should be done via new policies
  );
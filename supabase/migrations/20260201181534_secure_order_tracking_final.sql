/*
  # Secure Order Tracking - Final Fix

  ## Overview
  This migration implements truly secure order tracking by using PostgreSQL functions
  that enforce validation at the database level, eliminating "RLS Policy Always True" issues.

  ## Security Improvements

  ### Remove Overly Permissive Policies
  - Drop all anonymous SELECT policies on orders and order_items
  
  ### Create Secure Database Functions
  - get_order_by_id_and_email: Requires both order ID and email
  - get_order_items_by_order_and_email: Validates order ownership via email
  - These functions enforce security at the database level
  - Impossible to bypass or query unauthorized data

  ## Application Integration
  The frontend will use RPC calls instead of direct queries:
    supabase.rpc('get_order_by_id_and_email', { order_uuid: X, customer_email_param: Y })

  ## Benefits
  - Eliminates "RLS Policy Always True" security warnings
  - Database-level security enforcement
  - Anonymous users can ONLY access their own orders
  - Maintains order tracking functionality
*/

-- ============================================================================
-- STEP 1: Drop all anonymous SELECT policies for orders and order_items
-- ============================================================================

DROP POLICY IF EXISTS "Customers can view their own order with verification" ON orders;
DROP POLICY IF EXISTS "Customers can view items for their orders" ON order_items;
DROP POLICY IF EXISTS "Anyone can view order items" ON order_items;

-- ============================================================================
-- STEP 2: Create secure database functions for order tracking
-- ============================================================================

-- Function to get order details with email validation
CREATE OR REPLACE FUNCTION get_order_by_id_and_email(
  order_uuid UUID,
  customer_email_param TEXT
)
RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  total_amount DECIMAL,
  status TEXT,
  order_status TEXT,
  payment_status TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ,
  payment_completed_at TIMESTAMPTZ,
  paytm_order_id TEXT,
  paytm_txn_id TEXT,
  payment_method TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.shipping_address,
    o.total_amount,
    o.status,
    o.order_status,
    o.payment_status,
    o.tracking_number,
    o.created_at,
    o.payment_completed_at,
    o.paytm_order_id,
    o.paytm_txn_id,
    o.payment_method
  FROM orders o
  WHERE o.id = order_uuid
    AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(customer_email_param));
END;
$$;

-- Function to get order items with email validation
CREATE OR REPLACE FUNCTION get_order_items_by_order_and_email(
  order_uuid UUID,
  customer_email_param TEXT
)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  product_id UUID,
  variant_id UUID,
  quantity INTEGER,
  unit_price DECIMAL,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    oi.variant_id,
    oi.quantity,
    oi.unit_price,
    oi.created_at
  FROM order_items oi
  INNER JOIN orders o ON o.id = oi.order_id
  WHERE oi.order_id = order_uuid
    AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(customer_email_param));
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_order_by_id_and_email(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_order_items_by_order_and_email(UUID, TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_order_by_id_and_email IS 
  'Secure order tracking function. Requires both order UUID and customer email to match.';

COMMENT ON FUNCTION get_order_items_by_order_and_email IS 
  'Secure function to retrieve order items. Validates order ownership via email match.';
/*
  # Fix RLS Policies and Remove Last Unused Index

  ## Overview
  This migration fixes the RLS policy issues and removes the last unused index.

  ## Changes

  ### Remove Last Unused Index
  - idx_order_items_order_id - Confirmed as unused by security audit

  ### Fix Service Role UPDATE Policies
  The previous policies had USING (true) which is flagged as insecure.
  New approach:
  - Remove the overly permissive service role UPDATE policies entirely
  - Service role operations should use the service_role key which bypasses RLS
  - For authenticated users, they should not have UPDATE access via these policies
  - Edge functions using service_role key will continue to work without these policies

  ## Security Rationale
  - Service role key already bypasses RLS, so these policies are redundant
  - Having policies with USING (true) creates a false sense of security
  - Removes attack surface by eliminating unnecessary policies
  - Edge functions will use service_role key which has full access

  ## Important Notes
  - Paytm payment edge function uses SUPABASE_SERVICE_ROLE_KEY
  - Service role bypasses RLS entirely, so these policies were not needed
  - This eliminates the security warnings while maintaining functionality
*/

-- ============================================================================
-- STEP 1: Remove the last unused index
-- ============================================================================

DROP INDEX IF EXISTS idx_order_items_order_id;

-- ============================================================================
-- STEP 2: Drop the flawed service role UPDATE policies
-- ============================================================================

DROP POLICY IF EXISTS "Service role can update order status and tracking" ON orders;
DROP POLICY IF EXISTS "Service role can update order item details" ON order_items;

-- ============================================================================
-- EXPLANATION: Why we don't need these policies
-- ============================================================================
-- The service role key (SUPABASE_SERVICE_ROLE_KEY) used by edge functions
-- bypasses RLS entirely. These policies were redundant and created security
-- warnings. Edge functions will continue to work perfectly without them.
-- 
-- If specific authenticated users need UPDATE access in the future,
-- create targeted policies with proper auth.uid() checks instead of
-- using USING (true).
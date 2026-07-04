/*
  # Add Payment Tracking to Orders

  1. Changes
    - Add payment_status column to orders table (pending, completed, failed)
    - Add payment_method column (paytm, cod, etc.)
    - Add paytm_order_id for tracking Paytm transactions
    - Add paytm_txn_id for transaction reference
    - Add payment_completed_at timestamp
    
  2. Security
    - No RLS changes needed as orders table already has RLS
*/

-- Add payment tracking columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paytm_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN paytm_order_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paytm_txn_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN paytm_txn_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_completed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_completed_at timestamptz;
  END IF;
END $$;
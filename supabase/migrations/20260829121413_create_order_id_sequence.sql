/*
# Create atomic order ID sequence

## Purpose
Provides a concurrency-safe, monotonically increasing sequence for generating
customer-facing order IDs in the format RETR-1001, RETR-1002, RETR-1003, etc.

## Details
- Creates a PostgreSQL SEQUENCE named `retralabs_order_id_seq`
- Starts at 1001 (so first nextval returns 1001, formatted as RETR-1001)
- Increments by 1
- A SECURITY DEFINER function `get_next_order_id()` wraps nextval so the
  anon role can call it without direct sequence access
- This is the SINGLE source of truth for order IDs
*/

CREATE SEQUENCE IF NOT EXISTS retralabs_order_id_seq
  START WITH 1001
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

DROP FUNCTION IF EXISTS get_next_order_id();

CREATE OR REPLACE FUNCTION get_next_order_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'RETR-' || nextval('retralabs_order_id_seq')::text;
$$;

GRANT EXECUTE ON FUNCTION get_next_order_id() TO anon, authenticated;

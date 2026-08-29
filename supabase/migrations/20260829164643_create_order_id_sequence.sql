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
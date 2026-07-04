CREATE OR REPLACE FUNCTION get_order_by_id_and_email(
  order_uuid UUID,
  customer_email_param TEXT
)
RETURNS TABLE (
  id UUID, customer_name TEXT, customer_email TEXT, customer_phone TEXT,
  shipping_address TEXT, total_amount DECIMAL, status TEXT, order_status TEXT,
  payment_status TEXT, tracking_number TEXT, created_at TIMESTAMPTZ,
  payment_completed_at TIMESTAMPTZ, paytm_order_id TEXT, paytm_txn_id TEXT, payment_method TEXT
)
SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.customer_name, o.customer_email, o.customer_phone,
    o.shipping_address, o.total_amount, o.status, o.order_status,
    o.payment_status, o.tracking_number, o.created_at,
    o.payment_completed_at, o.paytm_order_id, o.paytm_txn_id, o.payment_method
  FROM orders o
  WHERE o.id = order_uuid
    AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(customer_email_param));
END;
$$;

CREATE OR REPLACE FUNCTION get_order_items_by_order_and_email(
  order_uuid UUID,
  customer_email_param TEXT
)
RETURNS TABLE (
  id UUID, order_id UUID, product_id UUID, variant_id UUID,
  quantity INTEGER, unit_price DECIMAL, created_at TIMESTAMPTZ
)
SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT oi.id, oi.order_id, oi.product_id, oi.variant_id,
    oi.quantity, oi.unit_price, oi.created_at
  FROM order_items oi
  INNER JOIN orders o ON o.id = oi.order_id
  WHERE oi.order_id = order_uuid
    AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(customer_email_param));
END;
$$;

GRANT EXECUTE ON FUNCTION get_order_by_id_and_email(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_order_items_by_order_and_email(UUID, TEXT) TO anon, authenticated;

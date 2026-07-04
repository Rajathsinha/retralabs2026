-- Ensure PUBLIC has no implicit EXECUTE grant on these functions.
-- postgres and service_role retain their grants; anon + authenticated are explicit.
REVOKE EXECUTE ON FUNCTION public.get_order_by_id_and_email(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_order_items_by_order_and_email(UUID, TEXT) FROM PUBLIC;

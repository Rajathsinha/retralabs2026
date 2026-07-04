-- 1. Fix contact_submissions INSERT policy:
--    Replace the always-true WITH CHECK with actual field validation.
DROP POLICY IF EXISTS "anon_insert_contact" ON contact_submissions;

CREATE POLICY "anon_insert_contact" ON contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(name))    > 0 AND
  length(trim(email))   > 0 AND email LIKE '%@%' AND
  length(trim(subject)) > 0 AND
  length(trim(message)) > 0
);

-- 2. Revoke EXECUTE from PUBLIC on both RPC functions (belt-and-suspenders)
--    then re-grant only to anon + authenticated explicitly.
REVOKE EXECUTE ON FUNCTION public.get_order_by_id_and_email(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_order_items_by_order_and_email(UUID, TEXT) FROM PUBLIC;

-- Re-create functions as SECURITY INVOKER so they respect RLS.
-- Orders/order_items have their own RLS; anon can reach them via these
-- functions only when the email+UUID pair matches (enforced in the WHERE clause).
-- We keep SECURITY DEFINER but restrict execution to only anon + authenticated,
-- and drop any implicit PUBLIC grant.
GRANT EXECUTE ON FUNCTION public.get_order_by_id_and_email(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_items_by_order_and_email(UUID, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_next_order_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next text;
BEGIN
  LOOP
    v_next := nextval('public.order_number_seq'::regclass)::text;
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE public.normalize_order_code(o.order_number) = v_next
         OR public.normalize_order_code(o.invoice_number) = v_next
         OR public.normalize_order_code(o.manual_code) = v_next
         OR public.normalize_order_code(o.tracking_code) = v_next
    );
  END LOOP;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_next_order_code() TO anon, authenticated, service_role;
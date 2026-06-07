CREATE OR REPLACE FUNCTION public.preview_next_order_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    GREATEST(
      COALESCE((SELECT MAX((order_number)::bigint) FROM public.orders WHERE order_number ~ '^[0-9]+$'), 0),
      COALESCE((SELECT MAX((invoice_number)::bigint) FROM public.orders WHERE invoice_number ~ '^[0-9]+$'), 0),
      COALESCE((SELECT MAX((manual_code)::bigint) FROM public.orders WHERE manual_code ~ '^[0-9]+$'), 0),
      COALESCE((SELECT MAX((tracking_code)::bigint) FROM public.orders WHERE tracking_code ~ '^[0-9]+$'), 0),
      COALESCE((SELECT last_value FROM public.order_number_seq), 0)
    ) + 1
  )::text
$$;

GRANT EXECUTE ON FUNCTION public.preview_next_order_code() TO anon, authenticated, service_role;
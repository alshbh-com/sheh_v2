CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

SELECT setval(
  'public.order_number_seq'::regclass,
  GREATEST(
    COALESCE((SELECT MAX((order_number)::bigint) FROM public.orders WHERE order_number ~ '^[0-9]+$'), 0),
    COALESCE((SELECT MAX((invoice_number)::bigint) FROM public.orders WHERE invoice_number ~ '^[0-9]+$'), 0),
    COALESCE((SELECT MAX((manual_code)::bigint) FROM public.orders WHERE manual_code ~ '^[0-9]+$'), 0),
    COALESCE((SELECT MAX((tracking_code)::bigint) FROM public.orders WHERE tracking_code ~ '^[0-9]+$'), 0),
    0
  ) + 1,
  false
);
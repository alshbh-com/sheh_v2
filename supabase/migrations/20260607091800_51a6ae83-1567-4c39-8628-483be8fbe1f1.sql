CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_candidate bigint;
  v_max_code bigint;
BEGIN
  SELECT GREATEST(
    COALESCE((SELECT MAX((order_number)::bigint) FROM public.orders WHERE order_number ~ '^[0-9]+$'), 0),
    COALESCE((SELECT MAX((invoice_number)::bigint) FROM public.orders WHERE invoice_number ~ '^[0-9]+$'), 0),
    COALESCE((SELECT MAX((manual_code)::bigint) FROM public.orders WHERE manual_code ~ '^[0-9]+$'), 0),
    COALESCE((SELECT MAX((tracking_code)::bigint) FROM public.orders WHERE tracking_code ~ '^[0-9]+$'), 0),
    0
  ) INTO v_max_code;

  IF public.normalize_order_code(NEW.order_number) IS NULL THEN
    v_candidate := GREATEST(nextval('public.order_number_seq'::regclass), v_max_code + 1);

    LOOP
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE public.normalize_order_code(o.order_number) = v_candidate::text
           OR public.normalize_order_code(o.invoice_number) = v_candidate::text
           OR public.normalize_order_code(o.manual_code) = v_candidate::text
           OR public.normalize_order_code(o.tracking_code) = v_candidate::text
      );
      v_candidate := v_candidate + 1;
    END LOOP;

    PERFORM setval('public.order_number_seq'::regclass, v_candidate, true);
    NEW.order_number := v_candidate::text;
  ELSE
    NEW.order_number := public.normalize_order_code(NEW.order_number);
  END IF;

  IF public.normalize_order_code(NEW.invoice_number) IS NULL THEN
    NEW.invoice_number := NEW.order_number;
  ELSE
    NEW.invoice_number := public.normalize_order_code(NEW.invoice_number);
  END IF;

  NEW.manual_code := public.normalize_order_code(NEW.manual_code);

  IF public.normalize_order_code(NEW.tracking_code) IS NULL THEN
    NEW.tracking_code := COALESCE(NEW.manual_code, NEW.order_number);
  ELSE
    NEW.tracking_code := public.normalize_order_code(NEW.tracking_code);
  END IF;

  RETURN NEW;
END;
$$;
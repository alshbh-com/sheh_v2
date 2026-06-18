
-- 1. Reset order_number_seq to start from 10000 for new orders
DO $$
DECLARE
  v_current bigint;
BEGIN
  SELECT GREATEST(
    COALESCE((SELECT MAX((order_number)::bigint) FROM public.orders WHERE order_number ~ '^[0-9]+$'), 0),
    COALESCE((SELECT MAX((invoice_number)::bigint) FROM public.orders WHERE invoice_number ~ '^[0-9]+$'), 0),
    9999
  ) INTO v_current;
  PERFORM setval('public.order_number_seq'::regclass, v_current, true);
END $$;

-- 2. Allow duplicate manual_code (page code) — drop unique index
DROP INDEX IF EXISTS public.orders_manual_code_unique_code_idx;

-- 3. Update prevent_duplicate_order_codes trigger to skip manual_code
CREATE OR REPLACE FUNCTION public.prevent_duplicate_order_codes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  FOR v_code IN
    SELECT DISTINCT code
    FROM unnest(ARRAY[
      public.normalize_order_code(NEW.order_number),
      public.normalize_order_code(NEW.invoice_number),
      public.normalize_order_code(NEW.tracking_code)
    ]) AS code
    WHERE code IS NOT NULL
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext(v_code));

    IF EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id IS DISTINCT FROM NEW.id
        AND (
          public.normalize_order_code(o.order_number) = v_code
          OR public.normalize_order_code(o.invoice_number) = v_code
          OR public.normalize_order_code(o.tracking_code) = v_code
        )
    ) THEN
      RAISE EXCEPTION 'duplicate_order_code:%', v_code USING ERRCODE = '23505';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 4. Update generate_order_number to NOT consider manual_code uniqueness,
--    set tracking_code = order_number (not manual_code) to allow manual_code duplicates,
--    and ensure numbers start from at least 10000
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_candidate bigint;
  v_max_code bigint;
BEGIN
  SELECT GREATEST(
    COALESCE((SELECT MAX((order_number)::bigint) FROM public.orders WHERE order_number ~ '^[0-9]+$'), 0),
    COALESCE((SELECT MAX((invoice_number)::bigint) FROM public.orders WHERE invoice_number ~ '^[0-9]+$'), 0),
    COALESCE((SELECT MAX((tracking_code)::bigint) FROM public.orders WHERE tracking_code ~ '^[0-9]+$'), 0),
    9999
  ) INTO v_max_code;

  IF public.normalize_order_code(NEW.order_number) IS NULL THEN
    v_candidate := GREATEST(nextval('public.order_number_seq'::regclass), v_max_code + 1);

    LOOP
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE public.normalize_order_code(o.order_number) = v_candidate::text
           OR public.normalize_order_code(o.invoice_number) = v_candidate::text
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

  -- tracking_code always = order_number (so manual_code can be duplicated freely)
  IF public.normalize_order_code(NEW.tracking_code) IS NULL THEN
    NEW.tracking_code := NEW.order_number;
  ELSE
    NEW.tracking_code := public.normalize_order_code(NEW.tracking_code);
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Update preview_next_order_code and reserve_next_order_code to skip manual_code
CREATE OR REPLACE FUNCTION public.preview_next_order_code()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    GREATEST(
      COALESCE((SELECT MAX((order_number)::bigint) FROM public.orders WHERE order_number ~ '^[0-9]+$'), 0),
      COALESCE((SELECT MAX((invoice_number)::bigint) FROM public.orders WHERE invoice_number ~ '^[0-9]+$'), 0),
      COALESCE((SELECT MAX((tracking_code)::bigint) FROM public.orders WHERE tracking_code ~ '^[0-9]+$'), 0),
      COALESCE((SELECT last_value FROM public.order_number_seq), 9999),
      9999
    ) + 1
  )::text
$function$;

CREATE OR REPLACE FUNCTION public.reserve_next_order_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         OR public.normalize_order_code(o.tracking_code) = v_next
    );
  END LOOP;
  RETURN v_next;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_order_code(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(btrim(_value), '')
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next text;
BEGIN
  IF public.normalize_order_code(NEW.order_number) IS NULL THEN
    LOOP
      v_next := nextval('order_number_seq')::text;
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE public.normalize_order_code(o.order_number) = v_next
           OR public.normalize_order_code(o.invoice_number) = v_next
           OR public.normalize_order_code(o.manual_code) = v_next
           OR public.normalize_order_code(o.tracking_code) = v_next
      );
    END LOOP;
    NEW.order_number := v_next;
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

CREATE OR REPLACE FUNCTION public.prevent_duplicate_order_codes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  FOR v_code IN
    SELECT code
    FROM unnest(ARRAY[
      public.normalize_order_code(NEW.order_number),
      public.normalize_order_code(NEW.invoice_number),
      public.normalize_order_code(NEW.manual_code),
      public.normalize_order_code(NEW.tracking_code)
    ]) AS code
    WHERE code IS NOT NULL
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id IS DISTINCT FROM NEW.id
        AND (
          public.normalize_order_code(o.order_number) = v_code
          OR public.normalize_order_code(o.invoice_number) = v_code
          OR public.normalize_order_code(o.manual_code) = v_code
          OR public.normalize_order_code(o.tracking_code) = v_code
        )
    ) THEN
      RAISE EXCEPTION 'duplicate_order_code:%', v_code USING ERRCODE = '23505';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();

DROP TRIGGER IF EXISTS prevent_duplicate_order_codes ON public.orders;
CREATE TRIGGER prevent_duplicate_order_codes
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_order_codes();

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_code_idx
ON public.orders (public.normalize_order_code(order_number))
WHERE public.normalize_order_code(order_number) IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_invoice_number_unique_code_idx
ON public.orders (public.normalize_order_code(invoice_number))
WHERE public.normalize_order_code(invoice_number) IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_manual_code_unique_code_idx
ON public.orders (public.normalize_order_code(manual_code))
WHERE public.normalize_order_code(manual_code) IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_code_unique_code_idx
ON public.orders (public.normalize_order_code(tracking_code))
WHERE public.normalize_order_code(tracking_code) IS NOT NULL;
CREATE OR REPLACE FUNCTION public.prevent_duplicate_order_codes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  FOR v_code IN
    SELECT DISTINCT code
    FROM unnest(ARRAY[
      public.normalize_order_code(NEW.order_number),
      public.normalize_order_code(NEW.invoice_number),
      public.normalize_order_code(NEW.manual_code),
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

DROP TRIGGER IF EXISTS prevent_duplicate_order_codes ON public.orders;
DROP TRIGGER IF EXISTS zz_prevent_duplicate_order_codes ON public.orders;
CREATE TRIGGER zz_prevent_duplicate_order_codes
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_order_codes();
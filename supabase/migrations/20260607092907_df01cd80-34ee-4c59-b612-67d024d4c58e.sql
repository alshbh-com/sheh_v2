CREATE OR REPLACE FUNCTION public.apply_return_stock_delta(_items jsonb, _sign int)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT (item->>'product_id')::uuid AS product_id,
           COALESCE((item->>'quantity')::numeric, 0) AS qty
    FROM jsonb_array_elements(_items) AS item
  LOOP
    IF rec.product_id IS NOT NULL AND rec.qty <> 0 THEN
      UPDATE public.products
      SET stock = COALESCE(stock, 0) + (_sign * rec.qty)::int,
          quantity = COALESCE(quantity, 0) + (_sign * rec.qty)::int,
          updated_at = now()
      WHERE id = rec.product_id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_stock_on_return()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.apply_return_stock_delta(NEW.returned_items, 1);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.apply_return_stock_delta(OLD.returned_items, -1);
    PERFORM public.apply_return_stock_delta(NEW.returned_items, 1);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.apply_return_stock_delta(OLD.returned_items, -1);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS returns_stock_adjust ON public.returns;
CREATE TRIGGER returns_stock_adjust
AFTER INSERT OR UPDATE OR DELETE ON public.returns
FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_return();
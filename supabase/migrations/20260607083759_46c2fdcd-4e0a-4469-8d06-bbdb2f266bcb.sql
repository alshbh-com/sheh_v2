
CREATE OR REPLACE FUNCTION public.adjust_product_stock_on_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.product_id IS NOT NULL AND COALESCE(NEW.quantity,0) <> 0 THEN
      UPDATE public.products
      SET stock = COALESCE(stock,0) - NEW.quantity,
          quantity = COALESCE(quantity,0) - NEW.quantity,
          updated_at = now()
      WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- restore old
    IF OLD.product_id IS NOT NULL AND COALESCE(OLD.quantity,0) <> 0 THEN
      UPDATE public.products
      SET stock = COALESCE(stock,0) + OLD.quantity,
          quantity = COALESCE(quantity,0) + OLD.quantity,
          updated_at = now()
      WHERE id = OLD.product_id;
    END IF;
    -- apply new
    IF NEW.product_id IS NOT NULL AND COALESCE(NEW.quantity,0) <> 0 THEN
      UPDATE public.products
      SET stock = COALESCE(stock,0) - NEW.quantity,
          quantity = COALESCE(quantity,0) - NEW.quantity,
          updated_at = now()
      WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NOT NULL AND COALESCE(OLD.quantity,0) <> 0 THEN
      UPDATE public.products
      SET stock = COALESCE(stock,0) + OLD.quantity,
          quantity = COALESCE(quantity,0) + OLD.quantity,
          updated_at = now()
      WHERE id = OLD.product_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_adjust_stock ON public.order_items;
CREATE TRIGGER trg_order_items_adjust_stock
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.adjust_product_stock_on_item();


-- 1) Make wholesale_price optional
ALTER TABLE public.products ALTER COLUMN wholesale_price DROP NOT NULL;

-- 2) Track original quantity on order items so partial-delivery can be re-edited
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS original_quantity numeric;
UPDATE public.order_items SET original_quantity = quantity WHERE original_quantity IS NULL;

-- Trigger to capture original_quantity on insert
CREATE OR REPLACE FUNCTION public.set_original_quantity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.original_quantity IS NULL THEN
    NEW.original_quantity := NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_set_original_quantity ON public.order_items;
CREATE TRIGGER order_items_set_original_quantity
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.set_original_quantity();

-- 3) Allow blocking customers by phone (block list becomes phone-based)
ALTER TABLE public.blocked_invoices ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.blocked_invoices ALTER COLUMN invoice_number DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blocked_invoices_phone ON public.blocked_invoices(customer_phone);

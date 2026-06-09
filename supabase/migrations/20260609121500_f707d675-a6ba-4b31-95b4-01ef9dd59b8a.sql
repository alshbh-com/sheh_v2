-- 1) Stop auto stock adjustments on order items and returns
DROP TRIGGER IF EXISTS trg_order_items_adjust_stock ON public.order_items;
DROP TRIGGER IF EXISTS returns_stock_adjust ON public.returns;

-- 2) Add wholesale fields to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS wholesale_code text;

CREATE UNIQUE INDEX IF NOT EXISTS products_wholesale_code_unique
  ON public.products (wholesale_code)
  WHERE wholesale_code IS NOT NULL AND btrim(wholesale_code) <> '';
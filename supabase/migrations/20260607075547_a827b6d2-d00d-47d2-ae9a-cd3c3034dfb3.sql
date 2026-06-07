
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS offer_price NUMERIC,
  ADD COLUMN IF NOT EXISTS size_options TEXT[],
  ADD COLUMN IF NOT EXISTS color_options TEXT[];

ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS return_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS returned_items JSONB;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_details TEXT;

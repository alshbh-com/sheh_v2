
ALTER TABLE public.treasury
  ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE public.statistics
  ADD COLUMN IF NOT EXISTS total_sales NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reset TIMESTAMPTZ;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS watermark_name TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS account_name TEXT;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_details JSONB;

ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS customer_id UUID;

ALTER TABLE public.cashbox_transactions
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT;

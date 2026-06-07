
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS modified_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_order_date TIMESTAMPTZ;

ALTER TABLE public.orders ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN invoice_number DROP NOT NULL;

ALTER TABLE public.order_items ALTER COLUMN product_name DROP NOT NULL;

ALTER TABLE public.system_passwords ALTER COLUMN password_type DROP NOT NULL;
ALTER TABLE public.system_passwords ALTER COLUMN password_value DROP NOT NULL;

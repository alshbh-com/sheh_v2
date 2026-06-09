ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS extra_number text;
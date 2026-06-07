
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone2 TEXT;

ALTER TABLE public.delivery_agents
  ADD COLUMN IF NOT EXISTS serial_number TEXT,
  ADD COLUMN IF NOT EXISTS total_owed NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.system_passwords ADD COLUMN IF NOT EXISTS password TEXT;
UPDATE public.system_passwords SET password = password_value WHERE password IS NULL;

ALTER TABLE public.treasury ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_printed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_username TEXT;

ALTER TABLE public.agent_payments
  ADD COLUMN IF NOT EXISTS delivery_agent_id UUID,
  ADD COLUMN IF NOT EXISTS payment_type TEXT;

-- FK so PostgREST can embed orders -> governorates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_governorate_id_fkey' AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_governorate_id_fkey
      FOREIGN KEY (governorate_id) REFERENCES public.governorates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- agent_daily_closings
CREATE TABLE IF NOT EXISTS public.agent_daily_closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_agent_id UUID,
  closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  closed_by UUID,
  closed_by_username TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_daily_closings TO anon, authenticated;
GRANT ALL ON public.agent_daily_closings TO service_role;
ALTER TABLE public.agent_daily_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open agent_daily_closings" ON public.agent_daily_closings FOR ALL USING (true) WITH CHECK (true);

-- RPC: delete old activity logs (older than 30 days)
CREATE OR REPLACE FUNCTION public.delete_old_activity_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.activity_logs WHERE created_at < now() - INTERVAL '30 days';
$$;
GRANT EXECUTE ON FUNCTION public.delete_old_activity_logs() TO anon, authenticated, service_role;


-- orders: tracking + manual codes + governorate link
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS manual_code TEXT,
  ADD COLUMN IF NOT EXISTS governorate_id UUID;

-- agent_payments: order link
ALTER TABLE public.agent_payments
  ADD COLUMN IF NOT EXISTS order_id UUID;

-- cashbox: opening balance + active flag
ALTER TABLE public.cashbox
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC NOT NULL DEFAULT 0;

-- products: quantity pricing tiers + offer flag
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quantity_pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_offer BOOLEAN NOT NULL DEFAULT false;

-- scan_sessions: align with app fields
ALTER TABLE public.scan_sessions
  ALTER COLUMN session_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS started_by UUID,
  ADD COLUMN IF NOT EXISTS started_by_username TEXT,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_scanned INTEGER NOT NULL DEFAULT 0;

-- scan_session_items: app uses session_id as uuid + scanned_code
ALTER TABLE public.scan_session_items
  ALTER COLUMN session_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS scanned_code TEXT;

-- scan_logs: status change fields
ALTER TABLE public.scan_logs
  ADD COLUMN IF NOT EXISTS old_status TEXT,
  ADD COLUMN IF NOT EXISTS new_status TEXT;

-- order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID,
  old_status TEXT,
  new_status TEXT,
  changed_by TEXT,
  changed_by_username TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_status_history TO anon, authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open order_status_history" ON public.order_status_history FOR ALL USING (true) WITH CHECK (true);

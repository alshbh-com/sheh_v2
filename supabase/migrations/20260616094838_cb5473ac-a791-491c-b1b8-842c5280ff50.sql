CREATE TABLE IF NOT EXISTS public.blocked_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  reason text,
  blocked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_invoices TO anon, authenticated;
GRANT ALL ON public.blocked_invoices TO service_role;
ALTER TABLE public.blocked_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked_invoices open access" ON public.blocked_invoices FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER set_blocked_invoices_updated_at BEFORE UPDATE ON public.blocked_invoices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_blocked_invoices_number ON public.blocked_invoices(invoice_number);
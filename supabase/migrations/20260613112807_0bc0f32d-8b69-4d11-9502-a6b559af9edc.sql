
CREATE TABLE public.agent_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  agent_name text NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('out','in')),
  total_qty integer NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_stock_movements TO anon, authenticated;
GRANT ALL ON public.agent_stock_movements TO service_role;

ALTER TABLE public.agent_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access to agent_stock_movements"
ON public.agent_stock_movements FOR ALL
USING (true) WITH CHECK (true);

CREATE TRIGGER set_agent_stock_movements_updated_at
BEFORE UPDATE ON public.agent_stock_movements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_agent_stock_movements_agent ON public.agent_stock_movements(agent_id, created_at DESC);

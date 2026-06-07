CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.reset_order_sequence()
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RETURN; END; $$;

CREATE TABLE public.app_settings (
  id text PRIMARY KEY DEFAULT 'main',
  platform_name text NOT NULL DEFAULT 'she',
  invoice_name text NOT NULL DEFAULT 'she',
  brand_name text NOT NULL DEFAULT 'she',
  logo_url text,
  watermark_url text,
  invoice_prefix text NOT NULL DEFAULT 'INV',
  invoice_footer text,
  invoice_warning text,
  active_theme text NOT NULL DEFAULT 'blue-default',
  active_template text NOT NULL DEFAULT 'classic',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open app_settings" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.system_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password_type text NOT NULL UNIQUE,
  password_value text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_passwords TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_passwords TO authenticated;
GRANT ALL ON public.system_passwords TO service_role;
ALTER TABLE public.system_passwords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open system_passwords" ON public.system_passwords FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER system_passwords_updated_at BEFORE UPDATE ON public.system_passwords FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  display_name text,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open admin_users" ON public.admin_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.admin_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.admin_users(id) ON DELETE CASCADE,
  admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE CASCADE,
  username text,
  permission text NOT NULL,
  permission_type text NOT NULL DEFAULT 'view',
  permission_key text,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT true,
  can_delete boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_user_permissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_user_permissions TO authenticated;
GRANT ALL ON public.admin_user_permissions TO service_role;
ALTER TABLE public.admin_user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open admin_user_permissions" ON public.admin_user_permissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER admin_user_permissions_updated_at BEFORE UPDATE ON public.admin_user_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  username text,
  action text NOT NULL,
  section text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open activity_logs" ON public.activity_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  barcode text UNIQUE,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  category text,
  purchase_price numeric(12,2) NOT NULL DEFAULT 0,
  price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  wholesale_price numeric(12,2) NOT NULL DEFAULT 0,
  min_price numeric(12,2) NOT NULL DEFAULT 0,
  color text,
  size text,
  stock integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  image_url text,
  images text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX products_code_idx ON public.products(code);
CREATE INDEX products_barcode_idx ON public.products(barcode);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open product_images" ON public.product_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER product_images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_color_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  color text NOT NULL,
  size text,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_color_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_color_variants TO authenticated;
GRANT ALL ON public.product_color_variants TO service_role;
ALTER TABLE public.product_color_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open product_color_variants" ON public.product_color_variants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER product_color_variants_updated_at BEFORE UPDATE ON public.product_color_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  secondary_phone text,
  address text,
  city text,
  governorate text,
  notes text,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.governorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  agent_shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governorates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governorates TO authenticated;
GRANT ALL ON public.governorates TO service_role;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open governorates" ON public.governorates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER governorates_updated_at BEFORE UPDATE ON public.governorates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  phone text,
  address text,
  logo_url text,
  watermark_url text,
  invoice_prefix text DEFAULT 'INV',
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offices TO authenticated;
GRANT ALL ON public.offices TO service_role;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open offices" ON public.offices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER offices_updated_at BEFORE UPDATE ON public.offices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.delivery_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE,
  address text,
  governorate text,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_agents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_agents TO authenticated;
GRANT ALL ON public.delivery_agents TO service_role;
ALTER TABLE public.delivery_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open delivery_agents" ON public.delivery_agents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER delivery_agents_updated_at BEFORE UPDATE ON public.delivery_agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  order_number text UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  governorate text,
  city text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  agent_shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  delivery_agent_id uuid REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  office_id uuid REFERENCES public.offices(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  delivered_at timestamptz,
  payment_date timestamptz,
  returned_at timestamptz,
  locked_at timestamptz,
  created_by text,
  source text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_code text,
  product_barcode text,
  product_name text NOT NULL,
  color text,
  size text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open order_items" ON public.order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  delivery_agent_id uuid REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  returned_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.returns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.returns TO authenticated;
GRANT ALL ON public.returns TO service_role;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open returns" ON public.returns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER returns_updated_at BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cashbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  initial_balance numeric(12,2) NOT NULL DEFAULT 0,
  transaction_type text NOT NULL DEFAULT 'income',
  payment_method text NOT NULL DEFAULT 'cash',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  description text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashbox TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashbox TO authenticated;
GRANT ALL ON public.cashbox TO service_role;
ALTER TABLE public.cashbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open cashbox" ON public.cashbox FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER cashbox_updated_at BEFORE UPDATE ON public.cashbox FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cashbox_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashbox_id uuid REFERENCES public.cashbox(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'income',
  transaction_type text NOT NULL DEFAULT 'income',
  payment_method text NOT NULL DEFAULT 'cash',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  description text,
  reference_type text,
  reference_id uuid,
  created_by text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashbox_transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashbox_transactions TO authenticated;
GRANT ALL ON public.cashbox_transactions TO service_role;
ALTER TABLE public.cashbox_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open cashbox_transactions" ON public.cashbox_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER cashbox_transactions_updated_at BEFORE UPDATE ON public.cashbox_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'الخزينة العامة',
  balance numeric(12,2) NOT NULL DEFAULT 0,
  cash_balance numeric(12,2) NOT NULL DEFAULT 0,
  transfer_balance numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury TO authenticated;
GRANT ALL ON public.treasury TO service_role;
ALTER TABLE public.treasury ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open treasury" ON public.treasury FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER treasury_updated_at BEFORE UPDATE ON public.treasury FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_orders integer NOT NULL DEFAULT 0,
  total_revenue numeric(12,2) NOT NULL DEFAULT 0,
  total_products integer NOT NULL DEFAULT 0,
  total_customers integer NOT NULL DEFAULT 0,
  stat_date date NOT NULL DEFAULT CURRENT_DATE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.statistics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.statistics TO authenticated;
GRANT ALL ON public.statistics TO service_role;
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open statistics" ON public.statistics FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER statistics_updated_at BEFORE UPDATE ON public.statistics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.agent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  agent_name text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_payments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_payments TO authenticated;
GRANT ALL ON public.agent_payments TO service_role;
ALTER TABLE public.agent_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open agent_payments" ON public.agent_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER agent_payments_updated_at BEFORE UPDATE ON public.agent_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  name text,
  status text NOT NULL DEFAULT 'active',
  username text,
  user_id text,
  total_items integer NOT NULL DEFAULT 0,
  scanned_items integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_sessions TO authenticated;
GRANT ALL ON public.scan_sessions TO service_role;
ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open scan_sessions" ON public.scan_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER scan_sessions_updated_at BEFORE UPDATE ON public.scan_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scan_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  scan_session_id uuid REFERENCES public.scan_sessions(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  code text,
  barcode text,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'scanned',
  scanned_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_session_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_session_items TO authenticated;
GRANT ALL ON public.scan_session_items TO service_role;
ALTER TABLE public.scan_session_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open scan_session_items" ON public.scan_session_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER scan_session_items_updated_at BEFORE UPDATE ON public.scan_session_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  action text NOT NULL,
  username text,
  user_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_logs TO authenticated;
GRANT ALL ON public.scan_logs TO service_role;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open scan_logs" ON public.scan_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  event_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open analytics_events" ON public.analytics_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.clear_agent_on_pending_processing()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('pending', 'processing') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.delivery_agent_id = NULL;
    NEW.assigned_at = NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER clear_agent_on_pending_processing_trigger BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.clear_agent_on_pending_processing();

CREATE OR REPLACE FUNCTION public.sync_customer_from_order()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_customer_id uuid;
BEGIN
  INSERT INTO public.customers(name, phone, address, city, governorate, notes, last_order_at)
  VALUES (NEW.customer_name, NEW.customer_phone, NEW.customer_address, NEW.city, NEW.governorate, NEW.notes, now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city, governorate = EXCLUDED.governorate, notes = EXCLUDED.notes, last_order_at = now(), updated_at = now()
  RETURNING id INTO v_customer_id;
  NEW.customer_id = v_customer_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER sync_customer_from_order_trigger BEFORE INSERT OR UPDATE OF customer_name, customer_phone, customer_address, city, governorate, notes ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_customer_from_order();

INSERT INTO public.app_settings (id, platform_name, invoice_name, brand_name, invoice_footer, invoice_warning)
VALUES ('main', 'she', 'she', 'she', 'ممنوع فتح الشحنة إلا بعد الدفع، والاستبدال أو الاسترجاع خلال 14 يوم من تاريخ الاستلام.', 'ممنوع فتح الشحنة إلا بعد الدفع');

INSERT INTO public.system_passwords (password_type, password_value, label) VALUES
('admin', '01013701405', 'كلمة مرور الأدمن'),
('vault', '01013701405', 'كلمة مرور الخزنة'),
('master', '01013701405', 'كلمة المرور الرئيسية');

INSERT INTO public.admin_users (username, password, role, is_active, display_name, full_name)
VALUES ('admin', '01013701405', 'admin', true, 'Admin', 'مدير النظام');

INSERT INTO public.treasury (name, balance, cash_balance, transfer_balance) VALUES ('الخزينة العامة', 0, 0, 0);
INSERT INTO public.cashbox (name, balance, initial_balance, transaction_type, payment_method, amount, description, transaction_date) VALUES ('خزنة ' || to_char(CURRENT_DATE, 'YYYY-MM-DD'), 0, 0, 'opening', 'cash', 0, 'رصيد افتتاحي تلقائي', CURRENT_DATE);

INSERT INTO public.governorates (name, shipping_cost, agent_shipping_cost) VALUES
('القاهرة',0,0),('الجيزة',0,0),('الإسكندرية',0,0),('الدقهلية',0,0),('البحر الأحمر',0,0),('البحيرة',0,0),('الفيوم',0,0),('الغربية',0,0),('الإسماعيلية',0,0),('المنوفية',0,0),('المنيا',0,0),('القليوبية',0,0),('الوادي الجديد',0,0),('السويس',0,0),('أسوان',0,0),('أسيوط',0,0),('بني سويف',0,0),('بورسعيد',0,0),('دمياط',0,0),('الشرقية',0,0),('جنوب سيناء',0,0),('كفر الشيخ',0,0),('مطروح',0,0),('الأقصر',0,0),('قنا',0,0),('شمال سيناء',0,0),('سوهاج',0,0);

INSERT INTO public.offices (name, invoice_prefix, is_active) VALUES ('المكتب الرئيسي', 'INV', true);
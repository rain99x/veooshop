
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'inventory_staff');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','inventory_staff'))
$$;

-- Profile + admin bootstrap trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  -- Auto-grant admin to the bootstrap email
  IF NEW.email = 'rain99x@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles RLS
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active products" ON public.products FOR SELECT USING (is_active = true OR public.is_staff(auth.uid()));
CREATE POLICY "Admins manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Inventory staff update products" ON public.products FOR UPDATE USING (public.has_role(auth.uid(),'inventory_staff')) WITH CHECK (public.has_role(auth.uid(),'inventory_staff'));

-- Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admins manage tags" ON public.tags FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.product_tags (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view product_tags" ON public.product_tags FOR SELECT USING (true);
CREATE POLICY "Admins manage product_tags" ON public.product_tags FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Inventory logs
CREATE TABLE public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change_amount INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view inventory logs" ON public.inventory_logs FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert inventory logs" ON public.inventory_logs FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- Orders (NO customer PII)
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','paid','preparing','ready_for_pickup','completed','cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL UNIQUE,
  status public.order_status NOT NULL DEFAULT 'pending',
  internal_note TEXT,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Anyone (incl. anon) can create an order shell (just the code + totals, no PII)
CREATE POLICY "Anyone create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff view orders" ON public.orders FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status public.order_status,
  new_status public.order_status NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view status logs" ON public.order_status_logs FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert status logs" ON public.order_status_logs FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Helpful indexes
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

-- Product status enum + column
CREATE TYPE public.product_status AS ENUM ('available','low_stock','made_to_order','sold_out','archived');

ALTER TABLE public.products
  ADD COLUMN status public.product_status NOT NULL DEFAULT 'available';

-- Owner stored in a separate table so only admins can read/write it
CREATE TYPE public.product_owner AS ENUM ('Linh','Tú');

CREATE TABLE public.product_owners (
  product_id uuid NOT NULL PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  owner public.product_owner NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_owners TO authenticated;
GRANT ALL ON public.product_owners TO service_role;

ALTER TABLE public.product_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage product owners"
  ON public.product_owners
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_product_owners_updated_at
  BEFORE UPDATE ON public.product_owners
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
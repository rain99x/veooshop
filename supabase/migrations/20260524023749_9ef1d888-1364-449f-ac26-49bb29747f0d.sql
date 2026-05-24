
-- Extend products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_handmade boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prep_time text;

-- Variants (colors) with per-variant inventory
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name text NOT NULL,
  color_hex text,
  inventory_quantity integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, color_name)
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON public.product_variants(product_id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active variants"
ON public.product_variants FOR SELECT
USING (is_active = true OR public.is_staff(auth.uid()));

CREATE POLICY "Admins manage variants"
ON public.product_variants FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Inventory staff update variants"
ON public.product_variants FOR UPDATE
USING (public.has_role(auth.uid(), 'inventory_staff'))
WITH CHECK (public.has_role(auth.uid(), 'inventory_staff'));

CREATE TRIGGER product_variants_set_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Code generator: takes a tag name, returns next available code "<Tag><n>"
CREATE OR REPLACE FUNCTION public.generate_product_code(_tag_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  n int;
  candidate text;
BEGIN
  -- Sanitize: keep alphanumerics, title-case-ish (just strip spaces)
  base := regexp_replace(coalesce(_tag_name, 'Item'), '[^a-zA-Z0-9]', '', 'g');
  IF base = '' THEN base := 'Item'; END IF;

  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(product_code, '^' || base, ''), '')::int
  ), 0) + 1
  INTO n
  FROM public.products
  WHERE product_code ~ ('^' || base || '[0-9]+$');

  candidate := base || n::text;

  -- Safety loop in case of race
  WHILE EXISTS (SELECT 1 FROM public.products WHERE product_code = candidate) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;

  RETURN candidate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_product_code(text) TO anon, authenticated;

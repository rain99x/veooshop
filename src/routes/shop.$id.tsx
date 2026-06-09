import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { cartStore } from "@/lib/cart-store";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag, Clock, Hand } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/shop/$id")({
  component: ProductPage,
});

type Variant = {
  id: string;
  color_name: string;
  color_hex: string | null;
  inventory_quantity: number;
  is_active: boolean;
  sort_order: number;
};

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_tags(tags(name)), product_variants(*)")
        .eq("id", id)
        .eq("is_active", true)
        .neq("status", "archived")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const variants: Variant[] = useMemo(
    () => (product?.product_variants ?? [])
      .filter((v: Variant) => v.is_active)
      .sort((a: Variant, b: Variant) => a.sort_order - b.sort_order),
    [product],
  );
  const hasVariants = variants.length > 0;
  const selectedVariant = variants.find((v) => v.id === variantId) ?? null;

  // Auto-select first in-stock variant
  useEffect(() => {
    if (hasVariants && !variantId) {
      const firstInStock = variants.find((v) => v.inventory_quantity > 0) ?? variants[0];
      setVariantId(firstInStock.id);
    }
  }, [hasVariants, variantId, variants]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <p className="text-muted-foreground">Piece not found.</p>
            <Link to="/shop" className="mt-4 inline-block underline text-sm">Back to shop</Link>
          </div>
        </div>
      </div>
    );
  }

  const stock = hasVariants
    ? (selectedVariant?.inventory_quantity ?? 0)
    : product.inventory_quantity;
  const soldOut = stock <= 0;
  const tags = (product.product_tags ?? [])
    .map((pt: { tags: { name: string } | null }) => pt.tags)
    .filter((t: { name: string } | null): t is { name: string } => !!t);

  const p = product;
  function addToCart() {
    if (hasVariants && !selectedVariant) {
      toast.error("Please select a color");
      return;
    }
    cartStore.add({
      product_id: p.id,
      product_code: p.product_code,
      variant_id: selectedVariant?.id ?? null,
      color_name: selectedVariant?.color_name ?? null,
      name: p.name,
      price: Number(p.price),
      image_url: p.image_url,
      max: stock,
    }, qty);
    toast.success(`Added ${p.name}${selectedVariant ? ` (${selectedVariant.color_name})` : ""} to your cart`);
  }


  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 py-12 w-full">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="size-4" /> Back to shop
        </Link>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
          <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-muted-foreground text-xs">No image</div>
            )}
          </div>

          <div className="flex flex-col">
            {tags.length > 0 && (
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                {tags.map((t: { name: string }) => t.name).join(" · ")}
              </div>
            )}
            <h1 className="font-display text-4xl sm:text-5xl">{product.name}</h1>
            {product.product_code && (
              <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                Code · {product.product_code}
              </div>
            )}
            <div className="mt-4 text-2xl text-muted-foreground">{formatPrice(product.price)}</div>

            {product.description && (
              <p className="mt-8 text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            )}

            {hasVariants && (
              <div className="mt-8">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                  Color {selectedVariant && <span className="text-foreground">· {selectedVariant.color_name}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const out = v.inventory_quantity <= 0;
                    const active = v.id === variantId;
                    return (
                      <button
                        key={v.id}
                        onClick={() => !out && setVariantId(v.id)}
                        disabled={out}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors ${
                          active ? "border-foreground bg-foreground text-background"
                          : out ? "border-border opacity-40 cursor-not-allowed line-through"
                          : "border-border hover:border-foreground/40"
                        }`}
                      >
                        {v.color_hex && (
                          <span className="inline-block size-3 rounded-full border border-border/50" style={{ background: v.color_hex }} />
                        )}
                        {v.color_name}
                        {out && <span className="ml-1 text-[10px] uppercase">Out</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-10 flex items-center gap-3">
              <div className="inline-flex items-center border border-border rounded-full">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="size-10 grid place-items-center text-muted-foreground hover:text-foreground"
                  disabled={soldOut}
                >−</button>
                <span className="w-8 text-center text-sm">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(stock, q + 1))}
                  className="size-10 grid place-items-center text-muted-foreground hover:text-foreground"
                  disabled={soldOut}
                >+</button>
              </div>

              <button
                disabled={soldOut}
                onClick={addToCart}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingBag className="size-4" />
                {soldOut ? "Sold out" : "Add to cart"}
              </button>
            </div>

            {!soldOut && (
              <button
                onClick={() => { addToCart(); navigate({ to: "/cart" }); }}
                className="mt-3 text-sm text-muted-foreground hover:text-foreground"
              >Buy now →</button>
            )}

            <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground space-y-2">
              {product.is_handmade && (
                <p className="inline-flex items-center gap-2"><Hand className="size-3.5" /> Handmade, one-of-a-kind</p>
              )}
              {product.prep_time && (
                <p className="inline-flex items-center gap-2"><Clock className="size-3.5" /> Prep time · {product.prep_time}</p>
              )}
              <p>· {stock > 0 ? `${stock} in stock${selectedVariant ? ` (${selectedVariant.color_name})` : ""}` : "Out of stock"}</p>
              <p>· Orders placed via Instagram DM</p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { cartStore } from "@/lib/cart-store";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/shop/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_tags(tags(name))")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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

  const soldOut = product.inventory_quantity <= 0;
  const tags = (product.product_tags ?? [])
    .map((pt: { tags: { name: string } | null }) => pt.tags)
    .filter((t: { name: string } | null): t is { name: string } => !!t);

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
            <div className="mt-4 text-2xl text-muted-foreground">{formatPrice(product.price)}</div>

            {product.description && (
              <p className="mt-8 text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
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
                  onClick={() => setQty((q) => Math.min(product.inventory_quantity, q + 1))}
                  className="size-10 grid place-items-center text-muted-foreground hover:text-foreground"
                  disabled={soldOut}
                >+</button>
              </div>

              <button
                disabled={soldOut}
                onClick={() => {
                  cartStore.add({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    image_url: product.image_url,
                    max: product.inventory_quantity,
                  }, qty);
                  toast.success(`Added ${product.name} to your cart`);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingBag className="size-4" />
                {soldOut ? "Sold out" : "Add to cart"}
              </button>
            </div>

            {!soldOut && (
              <button
                onClick={() => {
                  cartStore.add({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    image_url: product.image_url,
                    max: product.inventory_quantity,
                  }, qty);
                  navigate({ to: "/cart" });
                }}
                className="mt-3 text-sm text-muted-foreground hover:text-foreground"
              >
                Buy now →
              </button>
            )}

            <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground space-y-2">
              <p>· Handmade, one-of-a-kind</p>
              <p>· Orders placed via Instagram DM</p>
              <p>· {product.inventory_quantity > 0 ? `${product.inventory_quantity} in stock` : "Out of stock"}</p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

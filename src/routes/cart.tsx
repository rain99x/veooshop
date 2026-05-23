import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useCart, cartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Cart — veoo" }] }),
});

function CartPage() {
  const { items, total } = useCart();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-6 py-16 w-full">
        <h1 className="font-display text-4xl sm:text-5xl mb-10">Your cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-6">Your cart is empty.</p>
            <Link to="/shop" className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm">
              Browse the collection
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_320px] gap-12">
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.id} className="py-6 flex gap-4">
                  <div className="size-24 rounded-xl overflow-hidden bg-muted shrink-0">
                    {it.image_url && <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg truncate">{it.name}</h3>
                        <p className="text-sm text-muted-foreground">{formatPrice(it.price)}</p>
                      </div>
                      <button
                        onClick={() => cartStore.remove(it.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3 inline-flex items-center border border-border rounded-full">
                      <button
                        onClick={() => cartStore.setQty(it.id, it.quantity - 1)}
                        className="size-8 grid place-items-center text-muted-foreground hover:text-foreground"
                      >−</button>
                      <span className="w-8 text-center text-sm">{it.quantity}</span>
                      <button
                        onClick={() => cartStore.setQty(it.id, it.quantity + 1)}
                        className="size-8 grid place-items-center text-muted-foreground hover:text-foreground"
                      >+</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="bg-card border border-border rounded-2xl p-6 h-fit shadow-soft">
              <h2 className="font-display text-xl mb-4">Summary</h2>
              <div className="flex justify-between text-sm py-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-border">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">Calculated via DM</span>
              </div>
              <div className="flex justify-between py-4 font-medium">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <Link
                to="/checkout"
                className="mt-4 w-full inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90"
              >
                Continue to checkout
              </Link>
              <p className="mt-4 text-xs text-muted-foreground text-center">
                No online payment. You'll send your order via Instagram DM.
              </p>
            </aside>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

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
  const { items, selectedItems, selectedTotal, selectedCount } = useCart();
  const allSelected = items.length > 0 && items.every((i) => i.selected);
  const noneSelected = selectedItems.length === 0;

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
            <div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground pb-3 border-b border-border">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => cartStore.setAllSelected(e.target.checked)}
                  className="size-4 accent-foreground"
                />
                Select all ({items.length})
              </label>
              <ul className="divide-y divide-border">
                {items.map((it) => (
                  <li key={it.key} className="py-6 flex gap-4">
                    <input
                      type="checkbox"
                      checked={it.selected}
                      onChange={() => cartStore.toggleSelect(it.key)}
                      className="mt-2 size-4 accent-foreground shrink-0"
                      aria-label="Select item"
                    />
                    <div className="size-24 rounded-xl overflow-hidden bg-muted shrink-0">
                      {it.image_url && <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          {it.product_code && (
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                              {it.product_code}
                            </div>
                          )}
                          <h3 className="font-display text-lg truncate">{it.name}</h3>
                          {it.color_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">Color · {it.color_name}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">{formatPrice(it.price)}</p>
                        </div>
                        <button
                          onClick={() => cartStore.remove(it.key)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        ><Trash2 className="size-4" /></button>
                      </div>
                      <div className="mt-3 inline-flex items-center border border-border rounded-full">
                        <button
                          onClick={() => cartStore.setQty(it.key, it.quantity - 1)}
                          className="size-8 grid place-items-center text-muted-foreground hover:text-foreground"
                        >−</button>
                        <span className="w-8 text-center text-sm">{it.quantity}</span>
                        <button
                          onClick={() => cartStore.setQty(it.key, it.quantity + 1)}
                          className="size-8 grid place-items-center text-muted-foreground hover:text-foreground"
                        >+</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="bg-card border border-border rounded-2xl p-6 h-fit shadow-soft">
              <h2 className="font-display text-xl mb-4">Summary</h2>
              <div className="flex justify-between text-sm py-2">
                <span className="text-muted-foreground">Selected items</span>
                <span>{selectedCount}</span>
              </div>
              <div className="flex justify-between py-4 font-medium border-t border-border mt-2">
                <span>Total</span>
                <span>{formatPrice(selectedTotal)}</span>
              </div>
              {noneSelected ? (
                <button
                  disabled
                  className="mt-4 w-full inline-flex items-center justify-center rounded-full bg-primary/40 text-primary-foreground px-6 py-3 text-sm cursor-not-allowed"
                >Select items to checkout</button>
              ) : (
                <Link
                  to="/checkout"
                  className="mt-4 w-full inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90"
                >Thanh toán ({selectedCount})</Link>
              )}
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

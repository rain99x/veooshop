import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart, cartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { items, selectedItems, selectedTotal, selectedCount, count } = useCart();
  const allSelected = items.length > 0 && items.every((i) => i.selected);
  const noneSelected = selectedItems.length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative inline-flex items-center justify-center size-10 rounded-full hover:bg-accent transition-colors"
          aria-label="Open cart"
        >
          <ShoppingBag className="size-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-medium size-5 rounded-full grid place-items-center">
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border">
          <SheetTitle className="font-display text-2xl text-left">Your cart</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center px-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-6 text-sm">Your cart is empty.</p>
              <Link
                to="/shop"
                onClick={() => setOpen(false)}
                className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm"
              >
                Browse the collection
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 border-b border-border">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => cartStore.setAllSelected(e.target.checked)}
                  className="size-4 accent-foreground"
                />
                Select all ({items.length})
              </label>
            </div>

            <ul className="flex-1 overflow-y-auto divide-y divide-border px-6">
              {items.map((it) => (
                <li key={it.key} className="py-4 flex gap-3">
                  <input
                    type="checkbox"
                    checked={it.selected}
                    onChange={() => cartStore.toggleSelect(it.key)}
                    className="mt-2 size-4 accent-foreground shrink-0"
                    aria-label="Select item"
                  />
                  <div className="size-20 rounded-xl overflow-hidden bg-muted shrink-0">
                    {it.image_url && (
                      <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {it.product_code && (
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                            {it.product_code}
                          </div>
                        )}
                        <h3 className="font-display text-sm truncate">{it.name}</h3>
                        {it.color_name && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">· {it.color_name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatPrice(it.price)}</p>
                      </div>
                      <button
                        onClick={() => cartStore.remove(it.key)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Remove"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 inline-flex items-center border border-border rounded-full">
                      <button
                        onClick={() => cartStore.setQty(it.key, it.quantity - 1)}
                        className="size-7 grid place-items-center text-muted-foreground hover:text-foreground"
                      >−</button>
                      <span className="w-7 text-center text-xs">{it.quantity}</span>
                      <button
                        onClick={() => cartStore.setQty(it.key, it.quantity + 1)}
                        className="size-7 grid place-items-center text-muted-foreground hover:text-foreground"
                      >+</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border px-6 py-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Selected · {selectedCount}</span>
                <span className="font-medium">{formatPrice(selectedTotal)}</span>
              </div>
              {noneSelected ? (
                <button
                  disabled
                  className="w-full inline-flex items-center justify-center rounded-full bg-primary/40 text-primary-foreground px-6 py-3 text-sm cursor-not-allowed"
                >
                  Select items to checkout
                </button>
              ) : (
                <Link
                  to="/checkout"
                  onClick={() => setOpen(false)}
                  className="w-full inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90"
                >
                  Thanh toán ({selectedCount})
                </Link>
              )}
              <p className="text-[11px] text-muted-foreground text-center">
                No online payment. You'll send your order via Instagram DM.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

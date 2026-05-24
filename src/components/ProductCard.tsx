import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/format";

export type ProductCardData = {
  id: string;
  name: string;
  price: number | string;
  image_url: string | null;
  inventory_quantity: number;
  product_code?: string | null;
  tags?: { name: string }[];
  variants?: { inventory_quantity: number; is_active: boolean }[];
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const variantStock = (p.variants ?? [])
    .filter((v) => v.is_active)
    .reduce((s, v) => s + v.inventory_quantity, 0);
  const hasVariants = (p.variants?.length ?? 0) > 0;
  const totalStock = hasVariants ? variantStock : p.inventory_quantity;
  const soldOut = totalStock <= 0;

  return (
    <Link to="/shop/$id" params={{ id: p.id }} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground text-xs">
            No image
          </div>
        )}
        {soldOut && (
          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full">
            Sold out
          </div>
        )}
      </div>
      <div className="mt-4 px-1">
        {p.product_code && (
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-1">
            {p.product_code}
          </div>
        )}
        <h3 className="font-display text-lg leading-tight">{p.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{formatPrice(p.price)}</span>
          {p.tags && p.tags.length > 0 && (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {p.tags[0].name}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

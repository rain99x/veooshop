import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

export const Route = createFileRoute("/shop/")({
  component: Shop,
  head: () => ({
    meta: [
      { title: "Shop — veoo" },
      { name: "description", content: "Browse handmade jewelry by veoo. Filter by category, search by name." },
    ],
  }),
});

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  inventory_quantity: number;
  product_code: string | null;
  status: string | null;
  product_tags: { tags: { id: string; name: string } | null }[];
  product_variants: { inventory_quantity: number; is_active: boolean }[];
};

function Shop() {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, inventory_quantity, product_code, status, product_tags(tags(id, name)), product_variants(inventory_quantity, is_active)")
        .eq("is_active", true)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    return products
      .filter((p) =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.product_code ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
      .filter((p) => !activeTag || p.product_tags?.some((pt) => pt.tags?.id === activeTag))
      .map((p) => ({
        ...p,
        tags: (p.product_tags ?? [])
          .map((pt) => pt.tags)
          .filter((t): t is { id: string; name: string } => !!t),
        variants: p.product_variants ?? [],
      }));
  }, [products, search, activeTag]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-24 w-full">
        <div className="flex flex-col gap-6 mb-10">
          <h1 className="font-display text-4xl sm:text-5xl">The collection</h1>

          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag(null)}
                className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full border transition-colors ${
                  !activeTag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"
                }`}
              >All</button>
              {tags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTag(t.id)}
                  className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full border transition-colors ${
                    activeTag === t.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"
                  }`}
                >{t.name}</button>
              ))}
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="text-xs px-3 py-2 rounded-full text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                ><X className="size-3" /> Clear</button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No pieces match your search.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

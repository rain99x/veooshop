import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "veoo — handmade jewelry" },
      { name: "description", content: "Soft luxury, handcrafted pieces. Shop the collection and order via Instagram DM." },
    ],
  }),
});

function Home() {
  const { data: featured } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, inventory_quantity, product_tags(tags(name))")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data.map((p) => ({
        ...p,
        tags: (p.product_tags ?? [])
          .map((pt: { tags: { name: string } | null }) => pt.tags)
          .filter((t): t is { name: string } => !!t),
      }));
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Handmade · Limited pieces
          </div>
          <h1 className="mt-6 font-display text-5xl sm:text-7xl leading-[1.05]">
            Quiet jewelry,<br />
            <span className="italic text-gold">made by hand.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Small-batch pieces, soft metals, considered design. Each item is one of a kind.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Explore the collection <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://www.instagram.com/veooshop/"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              @veooshop →
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-display text-3xl">New arrivals</h2>
          <Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        </div>
        {featured && featured.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground text-sm">
            New pieces coming soon.
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

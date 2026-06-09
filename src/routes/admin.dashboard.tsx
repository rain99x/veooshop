import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: async () => {
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, is_active, status, inventory_quantity");
      if (pErr) throw pErr;
      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("status");
      if (oErr) throw oErr;

      const totalProducts = products.length;
      const activeProducts = products.filter((p) => p.is_active && p.status !== "archived").length;
      const soldOut = products.filter((p) => p.status === "sold_out").length;
      const lowStock = products.filter((p) => p.status === "low_stock").length;
      const pendingOrders = orders.filter((o) => o.status === "pending").length;
      const completedOrders = orders.filter((o) => o.status === "completed").length;

      return { totalProducts, activeProducts, soldOut, lowStock, pendingOrders, completedOrders };
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin", "dashboard", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_code, status, total_amount, item_count, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentInventory } = useQuery({
    queryKey: ["admin", "dashboard", "inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_logs")
        .select("id, change_amount, new_quantity, note, created_at, products(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as {
        id: string; change_amount: number; new_quantity: number; note: string | null;
        created_at: string; products: { name: string } | null;
      }[];
    },
  });

  const cards = [
    { label: "Total Products", value: stats?.totalProducts },
    { label: "Active Products", value: stats?.activeProducts },
    { label: "Sold Out", value: stats?.soldOut },
    { label: "Low Stock", value: stats?.lowStock },
    { label: "Pending Orders", value: stats?.pendingOrders },
    { label: "Completed Orders", value: stats?.completedOrders },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="border border-border rounded-2xl p-5 bg-card">
            <div className="text-3xl font-display">{c.value ?? "—"}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Recent Orders</h2>
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
          </div>
          <div className="space-y-2">
            {(recentOrders ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              (recentOrders ?? []).map((o) => (
                <div key={o.id} className="border border-border rounded-xl p-3 bg-card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs truncate">{o.order_code}</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs">{formatPrice(o.total_amount)}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">{o.status.replace(/_/g, " ")}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl mb-4">Recent Inventory Updates</h2>
          <div className="space-y-2">
            {(recentInventory ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No inventory updates yet.</div>
            ) : (
              (recentInventory ?? []).map((l) => (
                <div key={l.id} className="border border-border rounded-xl p-3 bg-card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{l.products?.name ?? "Unknown product"}</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}{l.note ? ` · ${l.note}` : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs ${l.change_amount >= 0 ? "text-foreground" : "text-destructive"}`}>
                      {l.change_amount >= 0 ? "+" : ""}{l.change_amount}
                    </div>
                    <div className="text-[11px] text-muted-foreground">now {l.new_quantity}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

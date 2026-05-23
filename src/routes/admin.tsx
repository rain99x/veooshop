import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Package, ScrollText, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — veoo" }] }),
});

function AdminLayout() {
  const { user, isStaff, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return null;

  if (!isStaff) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="font-display text-3xl">No access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have staff permissions. Ask an admin to grant you a role.
          </p>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  const nav = [
    { to: "/admin", label: "Orders", icon: ScrollText, exact: true },
    { to: "/admin/products", label: "Products", icon: Package, adminOnly: false },
    ...(isAdmin ? [{ to: "/admin/team", label: "Team", icon: ShieldCheck, adminOnly: true }] : []),
  ];

  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-card/30 p-6 md:min-h-screen">
        <Link to="/" className="font-display text-2xl block mb-1">
          veoo<span className="text-gold">.</span>
        </Link>
        <div className="text-xs text-muted-foreground mb-8">Admin</div>
        <nav className="space-y-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="size-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 pt-6 border-t border-border text-xs">
          <div className="text-muted-foreground truncate">{user.email}</div>
          <div className="text-muted-foreground mt-1">{isAdmin ? "Admin" : "Inventory staff"}</div>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="mt-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <main className="p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, ShieldCheck } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { count } = useCart();
  const { isStaff } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/about", label: "About" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl tracking-tight">
          veoo<span className="text-gold">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`transition-colors hover:text-foreground ${
                path === n.to ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-full"
            >
              <ShieldCheck className="size-3.5" />
              Admin
            </Link>
          )}
          <Link
            to="/cart"
            className="relative inline-flex items-center justify-center size-10 rounded-full hover:bg-accent transition-colors"
            aria-label="Cart"
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-medium size-5 rounded-full grid place-items-center">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="font-display text-xl text-foreground">veoo<span className="text-gold">.</span></div>
        <div>Handcrafted jewelry · Order via Instagram DM</div>
        <a
          href="https://www.instagram.com/veooshop/"
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          @veooshop
        </a>
      </div>
    </footer>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useCart, cartStore, generateOrderCode } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Instagram, Check } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout — veoo" }] }),
});

const INSTAGRAM_HANDLE = "veooshop";

function Checkout() {
  const { items, total } = useCart();
  const navigate = useNavigate();
  const [shipping, setShipping] = useState({
    name: "", phone: "", address: "", city: "", postal: "",
  });
  const [sellerNote, setSellerNote] = useState("");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0 && !orderCode) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Your cart is empty.</p>
            <Link to="/shop" className="underline text-sm">Browse the collection</Link>
          </div>
        </div>
      </div>
    );
  }

  function buildSummary(code: string) {
    const lines: string[] = [
      `🧾 ORDER ${code}`,
      "",
      "Products:",
    ];
    for (const i of items) {
      lines.push(`• ${i.product_code ?? i.name}`);
      if (i.color_name) lines.push(`  Color: ${i.color_name}`);
      lines.push(`  Qty: ${i.quantity} — ${formatPrice(i.price * i.quantity)}`);
    }
    if (sellerNote.trim()) {
      lines.push("", "Seller Note:", sellerNote.trim());
    }
    lines.push(
      "",
      `Temporary Total: ${formatPrice(total)}`,
      "",
      "Shipping to:",
      shipping.name,
      shipping.phone,
      shipping.address,
      `${shipping.city} ${shipping.postal}`.trim(),
      "",
      "— Sent from veoo.shop",
    );
    return lines.filter((l) => l !== undefined).join("\n");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shipping.name || !shipping.phone || !shipping.address) {
      toast.error("Please complete required fields");
      return;
    }
    setSubmitting(true);
    const code = generateOrderCode();
    const { error } = await supabase.from("orders").insert({
      order_code: code,
      status: "pending",
      total_amount: total,
      item_count: items.reduce((s, i) => s + i.quantity, 0),
    });
    if (error) {
      toast.error("Could not create order: " + error.message);
      setSubmitting(false);
      return;
    }
    setOrderCode(code);
    setSummary(buildSummary(code));
    setSubmitting(false);
  }

  async function copyAndOpenInstagram() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Order copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Copy failed — please copy manually");
    }
    window.open(`https://ig.me/m/${INSTAGRAM_HANDLE}`, "_blank");
  }

  function finishOrder() {
    cartStore.clear();
    navigate({ to: "/" });
    toast.success("Order placed. We'll confirm on Instagram.");
  }

  if (orderCode) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <section className="mx-auto max-w-2xl px-6 py-16 w-full">
          <div className="text-center">
            <div className="inline-grid place-items-center size-14 rounded-full bg-gold/20 mb-4">
              <Check className="size-6 text-foreground" />
            </div>
            <h1 className="font-display text-4xl">Almost done.</h1>
            <p className="mt-3 text-muted-foreground">
              Send the message below to <span className="text-foreground">@{INSTAGRAM_HANDLE}</span> on Instagram to confirm your order.
            </p>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
              Order code · <span className="text-foreground">{orderCode}</span>
            </div>
          </div>

          <pre className="mt-8 whitespace-pre-wrap text-sm bg-card border border-border rounded-2xl p-5 shadow-soft font-sans">
{summary}
          </pre>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={copyAndOpenInstagram}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              Copy & open Instagram
            </button>
            <a
              href={`https://ig.me/m/${INSTAGRAM_HANDLE}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm hover:bg-accent"
            >
              <Instagram className="size-4" /> Send via Instagram
            </a>
          </div>

          <button onClick={finishOrder} className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground">
            I sent the message — finish
          </button>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-6 py-16 w-full">
        <h1 className="font-display text-4xl sm:text-5xl mb-2">Checkout</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Your shipping details and notes stay in your browser. Only an order code is saved on our side.
        </p>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-[1fr_320px] gap-12">
          <div className="space-y-5">
            <Field label="Full name *" value={shipping.name} onChange={(v) => setShipping({ ...shipping, name: v })} />
            <Field label="Phone *" value={shipping.phone} onChange={(v) => setShipping({ ...shipping, phone: v })} />
            <Field label="Shipping address *" value={shipping.address} onChange={(v) => setShipping({ ...shipping, address: v })} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" value={shipping.city} onChange={(v) => setShipping({ ...shipping, city: v })} />
              <Field label="Postal code" value={shipping.postal} onChange={(v) => setShipping({ ...shipping, postal: v })} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Note to seller (optional)
              </label>
              <textarea
                value={sellerNote}
                onChange={(e) => setSellerNote(e.target.value)}
                rows={3}
                placeholder="e.g. gift wrapping, custom size, urgent order…"
                className="w-full rounded-xl border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Included in your Instagram message — not stored permanently.
              </p>
            </div>
          </div>

          <aside className="bg-card border border-border rounded-2xl p-6 h-fit shadow-soft">
            <h2 className="font-display text-xl mb-4">Order</h2>
            <ul className="space-y-3 text-sm">
              {items.map((i) => (
                <li key={i.key} className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="text-muted-foreground">{i.product_code ?? i.name}</span>
                    {i.color_name && <span className="block text-xs text-muted-foreground">Color: {i.color_name}</span>}
                    <span className="block text-xs text-muted-foreground">Qty: {i.quantity}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0">{formatPrice(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border mt-4 pt-4 flex justify-between font-medium">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Creating order…" : "Generate order summary"}
            </button>
          </aside>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
    </div>
  );
}

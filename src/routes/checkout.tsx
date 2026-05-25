import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useCart, cartStore, generateOrderCode } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Instagram, Check } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout — veoo" }] }),
});

const INSTAGRAM_HANDLE = "veooshop";

function Checkout() {
  const { selectedItems, selectedTotal, selectedCount } = useCart();
  const navigate = useNavigate();
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const creatingRef = useRef(false);

  // Build a compact text summary in the requested format:
  // "Order ABC - Sản phẩm TVT1 x1, LVT2 x2. Tổng tiền: 350.000 ₫"
  function buildSummary(code: string, items: typeof selectedItems, total: number) {
    const parts = items.map((i) => `${i.product_code ?? i.name} x${i.quantity}`).join(", ");
    return `Order ${code} - Sản phẩm ${parts}. Tổng tiền: ${formatPrice(total)}`;
  }

  useEffect(() => {
    if (orderCode || creatingRef.current) return;
    if (selectedItems.length === 0) return;
    creatingRef.current = true;
    (async () => {
      const code = generateOrderCode();
      const { error } = await supabase.from("orders").insert({
        order_code: code,
        status: "pending",
        total_amount: selectedTotal,
        item_count: selectedCount,
        internal_note: buildSummary(code, selectedItems, selectedTotal),
      });
      if (error) {
        toast.error("Could not create order: " + error.message);
        creatingRef.current = false;
        return;
      }
      setOrderCode(code);
      setSummary(buildSummary(code, selectedItems, selectedTotal));
    })();
  }, [selectedItems, selectedTotal, selectedCount, orderCode]);

  if (selectedItems.length === 0 && !orderCode) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Chưa có sản phẩm nào được chọn.</p>
            <Link to="/cart" className="underline text-sm">Quay lại giỏ hàng</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Đã copy nội dung đơn hàng");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Copy thất bại — vui lòng copy thủ công");
    }
  }

  function finishOrder() {
    // Remove the items we just ordered from the cart
    cartStore.removeKeys(selectedItems.map((i) => i.key));
    navigate({ to: "/" });
    toast.success("Đơn hàng đã được ghi nhận. Hẹn gặp bạn trên Instagram!");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-16 w-full">
        <div className="text-center">
          <div className="inline-grid place-items-center size-14 rounded-full bg-gold/20 mb-4">
            <Check className="size-6 text-foreground" />
          </div>
          <h1 className="font-display text-4xl">Đơn hàng đã sẵn sàng</h1>
          {orderCode && (
            <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              Mã đơn · <span className="text-foreground">{orderCode}</span>
            </div>
          )}
        </div>

        <div className="mt-8 bg-card border border-border rounded-2xl p-5 shadow-soft">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Nội dung đơn hàng
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{summary}</p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={copySummary}
            disabled={!summary}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            Copy đơn hàng
          </button>
          <a
            href={`https://ig.me/m/${INSTAGRAM_HANDLE}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm hover:bg-accent"
          >
            <Instagram className="size-4" /> Mở Instagram
          </a>
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center italic">
          Copy nội dung đơn hàng, sau đó nhắn tin chốt đơn qua Instagram :veooshop nha.
        </p>

        <div className="mt-8 border-t border-border pt-6">
          <h2 className="font-display text-lg mb-3">Chi tiết</h2>
          <ul className="space-y-2 text-sm">
            {selectedItems.map((i) => (
              <li key={i.key} className="flex justify-between gap-2">
                <span className="truncate">
                  <span className="text-foreground">{i.product_code ?? i.name}</span>
                  {i.color_name && <span className="text-muted-foreground"> · {i.color_name}</span>}
                  <span className="text-muted-foreground"> × {i.quantity}</span>
                </span>
                <span className="text-muted-foreground shrink-0">{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border mt-4 pt-4 flex justify-between font-medium">
            <span>Tổng tiền</span><span>{formatPrice(selectedTotal)}</span>
          </div>
        </div>

        <button onClick={finishOrder} className="mt-8 w-full text-sm text-muted-foreground hover:text-foreground">
          Tôi đã gửi tin nhắn — hoàn tất
        </button>
      </section>
      <SiteFooter />
    </div>
  );
}

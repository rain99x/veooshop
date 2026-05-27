import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useCart, cartStore, generateOrderCode } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Instagram, Check, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout — veoo" }] }),
});

const INSTAGRAM_HANDLE = "veooshop";

function Checkout() {
  const { selectedItems, selectedTotal, selectedCount } = useCart();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [orderCode] = useState(() => generateOrderCode());
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => {
    const parts = selectedItems
      .map((i) => `${i.product_code ?? i.name}${i.color_name ? ` (${i.color_name})` : ""} x${i.quantity}`)
      .join(", ");
    const lines = [
      `Order ${orderCode}`,
      `Sản phẩm: ${parts}`,
      `Tổng tiền: ${formatPrice(selectedTotal)}`,
      "",
      `Tên: ${name || "—"}`,
      `SĐT: ${phone || "—"}`,
      `Địa chỉ: ${address || "—"}`,
    ];
    if (note.trim()) lines.push(`Ghi chú: ${note.trim()}`);
    return lines.join("\n");
  }, [orderCode, selectedItems, selectedTotal, name, phone, address, note]);

  if (selectedItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center px-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Chưa có sản phẩm nào được chọn.</p>
            <Link to="/shop" className="underline text-sm">Quay lại cửa hàng</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const canCopy = name.trim() && phone.trim() && address.trim();

  async function copySummary() {
    if (!canCopy) {
      toast.error("Vui lòng nhập tên, SĐT và địa chỉ");
      return;
    }
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
    cartStore.removeKeys(selectedItems.map((i) => i.key));
    navigate({ to: "/" });
    toast.success("Đơn hàng đã ghi nhận. Hẹn gặp bạn trên Instagram!");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 py-12 w-full">
        <button
          onClick={() => navigate({ to: "/shop" })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" /> Tiếp tục mua sắm
        </button>

        <h1 className="font-display text-4xl sm:text-5xl">Thanh toán</h1>
        <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
          Mã đơn · <span className="text-foreground">{orderCode}</span>
        </div>

        <div className="mt-10 grid md:grid-cols-[1fr_360px] gap-10">
          {/* Form */}
          <div className="space-y-5">
            <h2 className="font-display text-xl">Thông tin nhận hàng</h2>
            <p className="text-xs text-muted-foreground -mt-3">
              Thông tin chỉ dùng để tạo nội dung tin nhắn — shop không lưu dữ liệu khách hàng.
            </p>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Họ tên *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Nguyễn Văn A"
                className="mt-2 rounded-xl h-11"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Số điện thoại *</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                inputMode="tel"
                placeholder="09xx xxx xxx"
                className="mt-2 rounded-xl h-11"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Địa chỉ giao hàng *</label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={300}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                className="mt-2 rounded-xl min-h-[90px]"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Ghi chú cho shop</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="Ví dụ: gói quà, khắc tên, ngày cần nhận…"
                className="mt-2 rounded-xl min-h-[80px]"
              />
            </div>
          </div>

          {/* Summary */}
          <aside className="space-y-5">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <h2 className="font-display text-lg mb-3">Đơn hàng</h2>
              <ul className="space-y-2 text-sm">
                {selectedItems.map((i) => (
                  <li key={i.key} className="flex justify-between gap-2">
                    <span className="truncate">
                      <span>{i.product_code ?? i.name}</span>
                      {i.color_name && <span className="text-muted-foreground"> · {i.color_name}</span>}
                      <span className="text-muted-foreground"> × {i.quantity}</span>
                    </span>
                    <span className="text-muted-foreground shrink-0">{formatPrice(i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border mt-4 pt-4 flex justify-between font-medium text-sm">
                <span>Tổng ({selectedCount})</span>
                <span>{formatPrice(selectedTotal)}</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Nội dung tin nhắn
              </div>
              <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words font-sans text-foreground/90">
{summary}
              </pre>
            </div>

            <div className="space-y-3">
              <button
                onClick={copySummary}
                disabled={!canCopy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                Copy đơn hàng
              </button>
              <a
                href={`https://ig.me/m/${INSTAGRAM_HANDLE}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm hover:bg-accent"
              >
                <Instagram className="size-4" /> Mở Instagram
              </a>
              <p className="text-xs text-muted-foreground text-center italic">
                Copy nội dung đơn hàng, sau đó nhắn tin chốt đơn qua Instagram :veooshop nha.
              </p>
              <button
                onClick={finishOrder}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2"
              >
                Tôi đã gửi tin nhắn — hoàn tất
              </button>
            </div>
          </aside>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

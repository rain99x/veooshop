import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/admin/account")({
  component: AccountSettings,
  head: () => ({ meta: [{ title: "Tài khoản — veoo admin" }] }),
});

function AccountSettings() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Đã đổi mật khẩu thành công");
      setPassword("");
      setConfirm("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không thể đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display text-3xl mb-1">Tài khoản</h1>
      <p className="text-sm text-muted-foreground mb-8">Đổi mật khẩu đăng nhập của bạn.</p>

      <div className="border border-border rounded-2xl p-6 bg-card">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="size-4 text-gold" />
          <h2 className="font-medium">Đổi mật khẩu</h2>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Mật khẩu mới</label>
            <input
              type="password" required minLength={6} placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Xác nhận mật khẩu</label>
            <input
              type="password" required minLength={6} placeholder="••••••••"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "…" : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}

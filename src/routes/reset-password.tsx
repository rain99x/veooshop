import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({ meta: [{ title: "Reset password — veoo admin" }] }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Mật khẩu cần ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display text-2xl block text-center mb-10">
          veoo<span className="text-gold">.</span>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-soft">
          <h1 className="font-display text-2xl mb-1">Đặt lại mật khẩu</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {ready
              ? "Nhập mật khẩu mới của bạn."
              : "Đang xác minh liên kết đặt lại mật khẩu…"}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <input
              type="password" required placeholder="mật khẩu mới" minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              disabled={!ready}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-50"
            />
            <input
              type="password" required placeholder="xác nhận mật khẩu" minLength={6}
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              disabled={!ready}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-50"
            />
            <button
              type="submit" disabled={loading || !ready}
              className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "…" : "Đổi mật khẩu"}
            </button>
          </form>
        </div>
        <Link to="/login" className="block text-center mt-6 text-xs text-muted-foreground hover:text-foreground">
          ← Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}

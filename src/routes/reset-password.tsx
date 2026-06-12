import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({ meta: [{ title: "Reset password — veoo admin" }] }),
});

function ResetPassword() {
  const navigate = useNavigate();
  // "recovery" = user arrived from the reset email and can set a new password.
  // "request"  = user needs to request a reset link by email.
  const [recovery, setRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    // If the recovery link already established a session, allow setting password.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && window.location.hash.includes("type=recovery")) {
        setRecovery(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Đã gửi liên kết đặt lại mật khẩu tới email của bạn.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không thể gửi liên kết");
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword(e: React.FormEvent) {
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

  const backToLogin = (
    <Link
      to="/login"
      className="block text-center mt-6 text-xs text-muted-foreground hover:text-foreground"
    >
      ← Back to sign in
    </Link>
  );

  if (recovery) {
    return (
      <AuthShell
        title="Set new password"
        subtitle="Enter a new password for your account."
        footer={backToLogin}
      >
        <form onSubmit={updatePassword} className="space-y-4">
          <input
            type="password" required placeholder="new password" minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <input
            type="password" required placeholder="confirm password" minLength={6}
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <button
            type="submit" disabled={loading}
            className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "…" : "Update password"}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={backToLogin}
    >
      <form onSubmit={sendLink} className="space-y-4">
        <input
          type="email" required placeholder="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        <button
          type="submit" disabled={loading}
          className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "…" : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}

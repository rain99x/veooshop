import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Sign in — veoo admin" }] }),
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created — check your inbox to confirm.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Đã gửi liên kết đổi mật khẩu tới email của bạn.");
        setMode("login");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
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
          <h1 className="font-display text-2xl mb-1">
            {mode === "login" ? "Staff sign in" : mode === "signup" ? "Create account" : "Quên mật khẩu"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "forgot"
              ? "Nhập email, chúng tôi sẽ gửi liên kết đổi mật khẩu."
              : "For shop staff only."}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <input
              type="email" required placeholder="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            {mode !== "forgot" && (
              <input
                type="password" required placeholder="password" minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            )}
            <button
              type="submit" disabled={loading}
              className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Gửi liên kết"}
            </button>
          </form>
          {mode === "login" && (
            <button
              onClick={() => setMode("forgot")}
              className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Quên mật khẩu?
            </button>
          )}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
        <Link to="/" className="block text-center mt-6 text-xs text-muted-foreground hover:text-foreground">
          ← Back to shop
        </Link>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/admin/team")({
  component: TeamAdmin,
});

type Role = "admin" | "inventory_staff";

function TeamAdmin() {
  const qc = useQueryClient();
  const { isAdmin, user: me } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("inventory_staff");

  const { data: members } = useQuery({
    queryKey: ["admin", "team"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("id, role, user_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(new Set(roles.map((r) => r.user_id)));
      const { data: profiles } = await supabase
        .from("profiles").select("id, email, display_name").in("id", userIds);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return roles.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
    },
    enabled: isAdmin,
  });

  const grantRole = useMutation({
    mutationFn: async () => {
      // Find user via profiles table
      const { data: profile, error: pErr } = await supabase
        .from("profiles").select("id").eq("email", email.trim()).maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error("No user with that email — they must sign up first.");
      const { error } = await supabase.from("user_roles").insert({ user_id: profile.id, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role granted");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin", "team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin", "team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) return null;

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Team</h1>

      <div className="border border-border rounded-2xl p-5 bg-card mb-6">
        <h2 className="font-display text-lg mb-3">Grant access</h2>
        <p className="text-xs text-muted-foreground mb-4">
          The user must sign up first at <code>/login</code>, then you can grant them a role here.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email" placeholder="user email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <select
            value={role} onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm"
          >
            <option value="inventory_staff">Inventory staff</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={() => grantRole.mutate()}
            disabled={!email || grantRole.isPending}
            className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            <UserPlus className="size-4" /> Grant
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {(members ?? []).map((m) => {
          const profile = m.profile;
          return (
            <div key={m.id} className="border border-border rounded-xl p-4 bg-card flex items-center justify-between">
              <div>
                <div className="text-sm">{profile?.email ?? m.user_id}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {m.role === "admin" ? "Admin" : "Inventory staff"}
                </div>
              </div>
              {m.user_id !== me?.id && (
                <button
                  onClick={() => { if (confirm("Revoke this role?")) revoke.mutate(m.id); }}
                  className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

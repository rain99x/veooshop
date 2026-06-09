import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Pencil, Plus, Trash2, Check, X } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesAdmin,
});

type Tag = { id: string; name: string };

function CategoriesAdmin() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: tags, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tags"] });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["products", "all"] });
  };

  const createTag = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("tags").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category added"); setNewName(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameTag = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("tags").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category updated"); setEditId(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <div className="p-4 rounded-xl bg-muted text-sm text-muted-foreground">
        Only admins can manage categories.
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl mb-6">Categories</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); if (newName.trim()) createTag.mutate(newName.trim()); }}
        className="flex gap-2 mb-8"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name (e.g. Necklace)"
          className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90">
          <Plus className="size-4" /> Add
        </button>
      </form>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : (tags ?? []).length === 0 ? (
        <div className="text-muted-foreground text-sm">No categories yet.</div>
      ) : (
        <div className="space-y-2">
          {(tags ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 border border-border rounded-xl px-4 py-3 bg-card">
              {editId === t.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  autoFocus
                />
              ) : (
                <span className="text-sm">{t.name}</span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {editId === t.id ? (
                  <>
                    <button onClick={() => renameTag.mutate({ id: t.id, name: editName.trim() })} className="p-1.5 rounded-md hover:bg-accent" aria-label="Save"><Check className="size-3.5" /></button>
                    <button onClick={() => setEditId(null)} className="p-1.5 rounded-md hover:bg-accent" aria-label="Cancel"><X className="size-3.5" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditId(t.id); setEditName(t.name); }} className="p-1.5 rounded-md hover:bg-accent" aria-label="Edit"><Pencil className="size-3.5" /></button>
                    <button onClick={() => { if (confirm(`Delete category "${t.name}"?`)) deleteTag.mutate(t.id); }} className="p-1.5 rounded-md hover:bg-accent text-destructive" aria-label="Delete"><Trash2 className="size-3.5" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-6">
        Categories are used as product tags and as shop filters. Deleting a category removes it from any products it was assigned to.
      </p>
    </div>
  );
}

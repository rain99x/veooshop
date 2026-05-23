import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Pencil, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/admin/products")({
  component: ProductsAdmin,
});

type Tag = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  inventory_quantity: number;
  is_active: boolean;
  product_tags: { tag_id: string; tags: Tag | null }[];
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const { isAdmin, user } = useAuth();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_tags(tag_id, tags(id, name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const updateInventory = useMutation({
    mutationFn: async ({ id, current, next, note }: { id: string; current: number; next: number; note?: string }) => {
      const { error } = await supabase.from("products").update({ inventory_quantity: next }).eq("id", id);
      if (error) throw error;
      await supabase.from("inventory_logs").insert({
        product_id: id, change_amount: next - current, new_quantity: next, note, changed_by: user?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Inventory updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Products</h1>
        {isAdmin && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90"
          >
            <Plus className="size-4" /> New product
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="mb-6 p-4 rounded-xl bg-muted text-sm text-muted-foreground">
          You can update inventory only. Ask an admin to add or edit products.
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(products ?? []).map((p) => (
            <ProductAdminCard
              key={p.id}
              p={p}
              isAdmin={isAdmin}
              onInventoryUpdate={(next, note) => updateInventory.mutate({ id: p.id, current: p.inventory_quantity, next, note })}
              onEdit={() => setEditing(p)}
              onDelete={() => {
                if (confirm(`Delete "${p.name}"?`)) deleteProduct.mutate(p.id);
              }}
            />
          ))}
        </div>
      )}

      {(creating || editing) && isAdmin && (
        <ProductForm
          product={editing}
          allTags={tags ?? []}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "products"] });
            qc.invalidateQueries({ queryKey: ["products", "all"] });
            qc.invalidateQueries({ queryKey: ["products", "featured"] });
            qc.invalidateQueries({ queryKey: ["tags"] });
            setCreating(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductAdminCard({
  p, isAdmin, onInventoryUpdate, onEdit, onDelete,
}: {
  p: Product;
  isAdmin: boolean;
  onInventoryUpdate: (next: number, note?: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [inv, setInv] = useState(p.inventory_quantity);
  const dirty = inv !== p.inventory_quantity;
  const tagNames = p.product_tags.map((pt) => pt.tags?.name).filter(Boolean).join(" · ");

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      <div className="aspect-square bg-muted relative">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">No image</div>
        )}
        {!p.is_active && (
          <div className="absolute top-2 left-2 bg-background text-xs px-2 py-1 rounded-full">Hidden</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg truncate">{p.name}</h3>
            <div className="text-xs text-muted-foreground mt-0.5">{formatPrice(p.price)}{tagNames && ` · ${tagNames}`}</div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-accent" aria-label="Edit"><Pencil className="size-3.5" /></button>
              <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-accent text-destructive" aria-label="Delete"><Trash2 className="size-3.5" /></button>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Stock</label>
          <input
            type="number" min={0}
            value={inv}
            onChange={(e) => setInv(parseInt(e.target.value) || 0)}
            className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm"
          />
          {dirty && (
            <button
              onClick={() => onInventoryUpdate(inv)}
              className="rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductForm({
  product, allTags, onClose, onSaved,
}: { product: Product | null; allTags: Tag[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    image_url: product?.image_url ?? "",
    inventory_quantity: product?.inventory_quantity ?? 0,
    is_active: product?.is_active ?? true,
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    product?.product_tags?.map((pt) => pt.tag_id) ?? []
  );
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let productId = product?.id;
      if (product) {
        const { error } = await supabase.from("products").update({
          name: form.name,
          description: form.description || null,
          price: form.price,
          image_url: form.image_url || null,
          inventory_quantity: form.inventory_quantity,
          is_active: form.is_active,
        }).eq("id", product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert({
          name: form.name,
          description: form.description || null,
          price: form.price,
          image_url: form.image_url || null,
          inventory_quantity: form.inventory_quantity,
          is_active: form.is_active,
        }).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Sync product_tags
      if (productId) {
        await supabase.from("product_tags").delete().eq("product_id", productId);
        if (selectedTagIds.length > 0) {
          const rows = selectedTagIds.map((tag_id) => ({ product_id: productId!, tag_id }));
          const { error } = await supabase.from("product_tags").insert(rows);
          if (error) throw error;
        }
      }

      toast.success(product ? "Product updated" : "Product created");
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function createTag() {
    const name = newTag.trim().toLowerCase();
    if (!name) return;
    const { data, error } = await supabase.from("tags").insert({ name }).select("id").single();
    if (error) { toast.error(error.message); return; }
    setSelectedTagIds([...selectedTagIds, data.id]);
    setNewTag("");
    // Refresh allTags via parent — we just push optimistically
    allTags.push({ id: data.id, name });
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 grid place-items-center p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl w-full max-w-lg shadow-card my-8">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display text-xl">{product ? "Edit product" : "New product"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent"><X className="size-4" /></button>
        </div>
        <form onSubmit={save} className="p-5 space-y-4">
          <FormField label="Name *">
            <input
              required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price *">
              <input
                type="number" step="0.01" min={0} required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="input"
              />
            </FormField>
            <FormField label="Inventory">
              <input
                type="number" min={0}
                value={form.inventory_quantity}
                onChange={(e) => setForm({ ...form, inventory_quantity: parseInt(e.target.value) || 0 })}
                className="input"
              />
            </FormField>
          </div>
          <FormField label="Image URL">
            <input
              type="url" placeholder="https://…"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="input"
            />
            <p className="text-xs text-muted-foreground mt-1">Paste a hosted image URL (Imgur, Cloudinary, etc.)</p>
          </FormField>

          <FormField label="Tags">
            <div className="flex flex-wrap gap-2">
              {allTags.map((t) => {
                const on = selectedTagIds.includes(t.id);
                return (
                  <button
                    key={t.id} type="button"
                    onClick={() => setSelectedTagIds(on ? selectedTagIds.filter((id) => id !== t.id) : [...selectedTagIds, t.id])}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      on ? "bg-primary text-primary-foreground border-primary" : "border-border"
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="new tag"
                className="input flex-1"
              />
              <button type="button" onClick={createTag} className="rounded-full border border-border px-4 text-xs">Add tag</button>
            </div>
          </FormField>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Visible in shop
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-border py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-full bg-primary text-primary-foreground py-2.5 text-sm disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:.75rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px oklch(0.78 0.08 80 / 0.3)}`}</style>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Pencil, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/admin/products")({
  component: ProductsAdmin,
});

type Tag = { id: string; name: string };
type Variant = {
  id: string;
  color_name: string;
  color_hex: string | null;
  inventory_quantity: number;
  sort_order: number;
  is_active: boolean;
};
type ProductStatus = "available" | "low_stock" | "made_to_order" | "sold_out" | "archived";
type Owner = "Linh" | "Tú";
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  inventory_quantity: number;
  is_active: boolean;
  product_code: string | null;
  is_handmade: boolean;
  prep_time: string | null;
  status: ProductStatus;
  product_tags: { tag_id: string; tags: Tag | null }[];
  product_variants: Variant[];
};

export const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "low_stock", label: "Low Stock" },
  { value: "made_to_order", label: "Made To Order" },
  { value: "sold_out", label: "Sold Out" },
  { value: "archived", label: "Archived" },
];
const STATUS_LABEL: Record<ProductStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
) as Record<ProductStatus, string>;
const OWNER_OPTIONS: Owner[] = ["Linh", "Tú"];

function ProductsAdmin() {
  const qc = useQueryClient();
  const { isAdmin, user } = useAuth();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_tags(tag_id, tags(id, name)), product_variants(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products ?? [];
    return (products ?? []).filter((p) => {
      const tagStr = p.product_tags.map((pt) => pt.tags?.name ?? "").join(" ").toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.product_code ?? "").toLowerCase().includes(q) ||
        tagStr.includes(q)
      );
    });
  }, [products, search]);

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  // Owner info is admin-only (RLS restricts the table to admins)
  const { data: owners } = useQuery({
    queryKey: ["product_owners"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("product_owners").select("product_id, owner");
      if (error) throw error;
      return data as { product_id: string; owner: Owner }[];
    },
  });
  const ownerMap = useMemo(() => {
    const m: Record<string, Owner> = {};
    (owners ?? []).forEach((o) => { m[o.product_id] = o.owner; });
    return m;
  }, [owners]);

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

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, product code, or tag…"
          className="w-full max-w-md rounded-full border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </div>

      {!isAdmin && (
        <div className="mb-6 p-4 rounded-xl bg-muted text-sm text-muted-foreground">
          You can update inventory only. Ask an admin to add or edit products.
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground text-sm">No products match your search.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProductAdminCard
              key={p.id}
              p={p}
              isAdmin={isAdmin}
              owner={ownerMap[p.id] ?? null}
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
          initialOwner={editing ? (ownerMap[editing.id] ?? null) : null}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "products"] });
            qc.invalidateQueries({ queryKey: ["products", "all"] });
            qc.invalidateQueries({ queryKey: ["products", "featured"] });
            qc.invalidateQueries({ queryKey: ["tags"] });
            qc.invalidateQueries({ queryKey: ["product_owners"] });
            setCreating(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductAdminCard({
  p, isAdmin, owner, onInventoryUpdate, onEdit, onDelete,
}: {
  p: Product;
  isAdmin: boolean;
  owner: Owner | null;
  onInventoryUpdate: (next: number, note?: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [inv, setInv] = useState(p.inventory_quantity);
  const dirty = inv !== p.inventory_quantity;
  const tagNames = p.product_tags.map((pt) => pt.tags?.name).filter(Boolean).join(" · ");
  const hasVariants = p.product_variants.length > 0;
  const variantStock = p.product_variants.reduce((s, v) => s + v.inventory_quantity, 0);

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
        {p.product_code && (
          <div className="absolute top-2 right-2 bg-background/90 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full">
            {p.product_code}
          </div>
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

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-border">
            {STATUS_LABEL[p.status]}
          </span>
          {isAdmin && owner && (
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent text-foreground">
              Owner · {owner}
            </span>
          )}
        </div>


        {hasVariants ? (
          <div className="mt-3 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Variants · {variantStock} total in stock
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.product_variants.map((v) => (
                <span key={v.id} className={`text-[11px] px-2 py-0.5 rounded-full border ${v.inventory_quantity <= 0 ? "border-border text-muted-foreground line-through" : "border-border"}`}>
                  {v.color_name}: {v.inventory_quantity}
                </span>
              ))}
            </div>
          </div>
        ) : (
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
              >Save</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type VariantDraft = {
  id?: string;
  color_name: string;
  color_hex: string;
  inventory_quantity: number;
};

function ProductForm({
  product, allTags, initialOwner, onClose, onSaved,
}: { product: Product | null; allTags: Tag[]; initialOwner: Owner | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    image_url: product?.image_url ?? "",
    inventory_quantity: product?.inventory_quantity ?? 0,
    is_active: product?.is_active ?? true,
    is_handmade: product?.is_handmade ?? true,
    prep_time: product?.prep_time ?? "",
    product_code: product?.product_code ?? "",
    status: (product?.status ?? "available") as ProductStatus,
  });
  const [owner, setOwner] = useState<Owner | "">(initialOwner ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    product?.product_tags?.map((pt) => pt.tag_id) ?? []
  );
  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.product_variants?.map((v) => ({
      id: v.id,
      color_name: v.color_name,
      color_hex: v.color_hex ?? "",
      inventory_quantity: v.inventory_quantity,
    })) ?? []
  );
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [tagsLocal, setTagsLocal] = useState(allTags);

  const firstTagName = useMemo(() => {
    const first = selectedTagIds[0];
    return tagsLocal.find((t) => t.id === first)?.name ?? null;
  }, [selectedTagIds, tagsLocal]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let productId = product?.id;

      // Determine product_code (auto-generate on create if blank)
      let productCode = form.product_code.trim();
      if (!product && !productCode) {
        const { data: codeData, error: codeErr } = await supabase.rpc("generate_product_code", {
          _tag_name: firstTagName ?? "Item",
        });
        if (codeErr) throw codeErr;
        productCode = codeData as string;
      }

      const payload = {
        name: form.name,
        description: form.description || null,
        price: form.price,
        image_url: form.image_url || null,
        inventory_quantity: form.inventory_quantity,
        is_active: form.is_active,
        is_handmade: form.is_handmade,
        prep_time: form.prep_time || null,
        product_code: productCode || null,
        status: form.status,
      };

      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
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

        // Sync owner (admin-only table)
        if (owner) {
          const { error } = await supabase
            .from("product_owners")
            .upsert({ product_id: productId, owner }, { onConflict: "product_id" });
          if (error) throw error;
        } else {
          await supabase.from("product_owners").delete().eq("product_id", productId);
        }


        // Sync variants — delete removed, upsert kept
        const existingIds = (product?.product_variants ?? []).map((v) => v.id);
        const keepIds = variants.map((v) => v.id).filter(Boolean) as string[];
        const toDelete = existingIds.filter((id) => !keepIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from("product_variants").delete().in("id", toDelete);
        }
        for (let idx = 0; idx < variants.length; idx++) {
          const v = variants[idx];
          if (!v.color_name.trim()) continue;
          if (v.id) {
            await supabase.from("product_variants").update({
              color_name: v.color_name.trim(),
              color_hex: v.color_hex || null,
              inventory_quantity: v.inventory_quantity,
              sort_order: idx,
            }).eq("id", v.id);
          } else {
            await supabase.from("product_variants").insert({
              product_id: productId,
              color_name: v.color_name.trim(),
              color_hex: v.color_hex || null,
              inventory_quantity: v.inventory_quantity,
              sort_order: idx,
            });
          }
        }
      }

      toast.success(product ? "Product updated" : `Product created · ${productCode}`);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function createTag() {
    const name = newTag.trim();
    if (!name) return;
    const { data, error } = await supabase.from("tags").insert({ name }).select("id, name").single();
    if (error) { toast.error(error.message); return; }
    setTagsLocal([...tagsLocal, data as Tag]);
    setSelectedTagIds([...selectedTagIds, data.id]);
    setNewTag("");
  }

  function addVariant() {
    setVariants([...variants, { color_name: "", color_hex: "", inventory_quantity: 0 }]);
  }
  function updateVariant(i: number, patch: Partial<VariantDraft>) {
    setVariants(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function removeVariant(i: number) {
    setVariants(variants.filter((_, idx) => idx !== i));
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
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </FormField>

          <FormField label={product ? "Product code" : "Product code (auto from tag)"}>
            <input
              value={form.product_code}
              onChange={(e) => setForm({ ...form, product_code: e.target.value })}
              placeholder={!product && firstTagName ? `Auto: ${firstTagName}N` : "Leave blank to auto-generate"}
              className="input"
            />
          </FormField>

          <FormField label="Description">
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price (VND) *">
              <input
                type="number" step="1" min={0} required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="input"
              />
            </FormField>
            <FormField label="Prep time">
              <input
                value={form.prep_time}
                onChange={(e) => setForm({ ...form, prep_time: e.target.value })}
                placeholder="e.g. 3–5 days"
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
              {tagsLocal.map((t) => {
                const on = selectedTagIds.includes(t.id);
                return (
                  <button
                    key={t.id} type="button"
                    onClick={() => setSelectedTagIds(on ? selectedTagIds.filter((id) => id !== t.id) : [...selectedTagIds, t.id])}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      on ? "bg-primary text-primary-foreground border-primary" : "border-border"
                    }`}
                  >{t.name}</button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="new tag (e.g. Bracelet)" className="input flex-1" />
              <button type="button" onClick={createTag} className="rounded-full border border-border px-4 text-xs">Add tag</button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Product code format: [TagName][number] — first selected tag is used.
            </p>
          </FormField>

          <FormField label="Color variants (per-color stock)">
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={v.color_hex || "#cccccc"}
                    onChange={(e) => updateVariant(i, { color_hex: e.target.value })}
                    className="size-8 rounded border border-border bg-transparent cursor-pointer"
                  />
                  <input
                    value={v.color_name}
                    onChange={(e) => updateVariant(i, { color_name: e.target.value })}
                    placeholder="Color name (e.g. Gold)"
                    className="input flex-1"
                  />
                  <input
                    type="number" min={0}
                    value={v.inventory_quantity}
                    onChange={(e) => updateVariant(i, { inventory_quantity: parseInt(e.target.value) || 0 })}
                    className="input w-20"
                    title="Stock"
                  />
                  <button type="button" onClick={() => removeVariant(i)} className="p-1.5 rounded-md hover:bg-accent text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 text-xs rounded-full border border-border px-3 py-1.5">
                <Plus className="size-3" /> Add color
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              If you add variants, per-color stock is used. Otherwise the simple stock field below applies.
            </p>
          </FormField>

          {variants.length === 0 && (
            <FormField label="Inventory">
              <input
                type="number" min={0}
                value={form.inventory_quantity}
                onChange={(e) => setForm({ ...form, inventory_quantity: parseInt(e.target.value) || 0 })}
                className="input"
              />
            </FormField>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Visible in shop
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_handmade} onChange={(e) => setForm({ ...form, is_handmade: e.target.checked })} />
              Handmade
            </label>
          </div>

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

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/")({
  component: OrdersDashboard,
});

const STATUSES = [
  "pending", "confirmed", "paid", "preparing", "ready_for_pickup", "completed", "cancelled",
] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  paid: "Paid",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

function OrdersDashboard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Status | "all">("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, old_status }: { id: string; status: Status; old_status: Status }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_status_logs").insert({
        order_id: id, old_status, new_status: status, changed_by: user?.id,
      });
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.from("orders").update({ internal_note: note }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note saved");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });

  const filtered = (orders ?? []).filter((o) => filter === "all" || o.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Orders</h1>
        <div className="text-sm text-muted-foreground">{orders?.length ?? 0} total</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>All</FilterBtn>
        {STATUSES.map((s) => (
          <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>
            {STATUS_LABEL[s]}
          </FilterBtn>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground text-sm py-12 text-center">No orders.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              onStatus={(status) => updateStatus.mutate({ id: o.id, status, old_status: o.status as Status })}
              onSaveNote={(note) => updateNote.mutate({ id: o.id, note })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

type Order = {
  id: string;
  order_code: string;
  status: string;
  internal_note: string | null;
  total_amount: number;
  item_count: number;
  created_at: string;
};

function OrderRow({
  order, onStatus, onSaveNote,
}: { order: Order; onStatus: (s: Status) => void; onSaveNote: (note: string) => void }) {
  const [note, setNote] = useState(order.internal_note ?? "");
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-2xl p-5 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-sm">{order.order_code}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.created_at).toLocaleString()} · {order.item_count} items · {formatPrice(order.total_amount)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={order.status}
            onChange={(e) => onStatus(e.target.value as Status)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button onClick={() => setOpen(!open)} className="text-xs text-muted-foreground hover:text-foreground">
            {open ? "Hide" : "Note"}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-4 flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note (not visible to customer)"
            rows={2}
            className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <button
            onClick={() => onSaveNote(note)}
            className="self-end rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs"
          >
            Save note
          </button>
        </div>
      )}
    </div>
  );
}

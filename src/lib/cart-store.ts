import { useEffect, useState, useSyncExternalStore } from "react";

export type CartItem = {
  /** Stable line key — product_id + variant_id (so same product in different colors = different lines) */
  key: string;
  product_id: string;
  product_code: string | null;
  variant_id: string | null;
  color_name: string | null;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  max: number;
  selected: boolean;
};

const KEY = "veoo_cart_v2";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();
let snapshot: CartItem[] = [];
let initialized = false;

function notify() { listeners.forEach((l) => l()); }

function persist(items: CartItem[]) {
  snapshot = items;
  if (typeof window !== "undefined") sessionStorage.setItem(KEY, JSON.stringify(items));
  notify();
}

export function makeLineKey(productId: string, variantId: string | null) {
  return `${productId}::${variantId ?? ""}`;
}

export const cartStore = {
  init() {
    if (initialized) return;
    initialized = true;
    snapshot = read();
    notify();
  },
  subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); },
  get() { return snapshot; },
  add(item: Omit<CartItem, "quantity" | "key" | "selected"> & { key?: string }, qty = 1) {
    const key = item.key ?? makeLineKey(item.product_id, item.variant_id);
    const items = [...snapshot];
    const existing = items.find((i) => i.key === key);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, item.max);
      existing.selected = true;
    } else {
      items.push({ ...item, key, quantity: Math.min(qty, item.max), selected: true });
    }
    persist(items);
  },
  setQty(key: string, qty: number) {
    const items = snapshot
      .map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(qty, i.max)) } : i))
      .filter((i) => i.quantity > 0);
    persist(items);
  },
  remove(key: string) { persist(snapshot.filter((i) => i.key !== key)); },
  clear() { persist([]); },
};

export function useCart() {
  const [ready, setReady] = useState(false);
  useEffect(() => { cartStore.init(); setReady(true); }, []);
  const items = useSyncExternalStore(
    cartStore.subscribe,
    () => cartStore.get(),
    () => [] as CartItem[],
  );
  return {
    items: ready ? items : [],
    count: items.reduce((s, i) => s + i.quantity, 0),
    total: items.reduce((s, i) => s + i.quantity * i.price, 0),
  };
}

export function generateOrderCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VEOO-${ts}-${rand}`;
}

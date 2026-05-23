import { useEffect, useState, useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  max: number;
};

const KEY = "veoo_cart_v1";

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

function notify() {
  listeners.forEach((l) => l());
}

function persist(items: CartItem[]) {
  snapshot = items;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY, JSON.stringify(items));
  }
  notify();
}

export const cartStore = {
  init() {
    if (initialized) return;
    initialized = true;
    snapshot = read();
    notify();
  },
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get() {
    return snapshot;
  },
  add(item: Omit<CartItem, "quantity">, qty = 1) {
    const items = [...snapshot];
    const existing = items.find((i) => i.id === item.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, item.max);
    } else {
      items.push({ ...item, quantity: Math.min(qty, item.max) });
    }
    persist(items);
  },
  setQty(id: string, qty: number) {
    const items = snapshot
      .map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(qty, i.max)) } : i))
      .filter((i) => i.quantity > 0);
    persist(items);
  },
  remove(id: string) {
    persist(snapshot.filter((i) => i.id !== id));
  },
  clear() {
    persist([]);
  },
};

export function useCart() {
  // SSR-safe init via effect
  const [ready, setReady] = useState(false);
  useEffect(() => {
    cartStore.init();
    setReady(true);
  }, []);
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

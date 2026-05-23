export function formatPrice(n: number | string) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(isNaN(v) ? 0 : v);
}

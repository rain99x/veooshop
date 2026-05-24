// VND formatter — e.g. 350000 → "350.000 ₫"
const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatPrice(n: number | string) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return vnd.format(isNaN(v) ? 0 : v);
}

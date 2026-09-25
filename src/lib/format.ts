export function formatBytes(n: number) {
  if (!isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export const inr = (n: number, digits = 0) =>
  isFinite(n) ? "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "—";

export const num = (n: number, digits = 2) =>
  isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: digits }) : "—";

export function savings(before: number, after: number) {
  if (!before) return 0;
  return Math.round(((before - after) / before) * 1000) / 10;
}

export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

export function extFor(mime: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf", "text/plain": "txt", "application/json": "json", "text/csv": "csv", "application/zip": "zip", "image/svg+xml": "svg" } as Record<string, string>)[mime] || "bin";
}

export function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

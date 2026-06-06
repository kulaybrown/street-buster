export const BASE_URL = (import.meta?.env?.BASE_URL ?? "/") || "/";

export function withBase(path) {
  const p = String(path || "");
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const normalizedPath = p.startsWith("/") ? p.slice(1) : p;
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  return `${base}/${normalizedPath}`;
}


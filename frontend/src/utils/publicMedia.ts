/** Resolve only server-owned uploaded-media paths against the configured API origin. */
export function resolvePublicMedia<T>(value: T, base: string): T {
  const walk = (v: any): any =>
    typeof v === "string" && /^\/api\/v1\/media\/[a-f0-9-]{36}\.webp$/.test(v)
      ? new URL(v, base).href
      : Array.isArray(v)
        ? v.map(walk)
        : v && typeof v === "object"
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
          : v;
  return walk(value);
}

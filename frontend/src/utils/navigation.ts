export function safeInternalPath(value: string | null, fallback = "/account") {
  if (
    !value ||
    value.length > 2000 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "https://local.invalid");
    if (
      url.origin !== "https://local.invalid" ||
      !/^\/(?:account(?:\/(?:profile|security|inquiries(?:\/[a-f0-9-]{36})?))?|inquiries\/new|products(?:\/[a-z0-9-]+)?|find-your-product|staff(?:\/[a-z0-9/-]+)?)$/.test(
        url.pathname,
      )
    )
      return fallback;
    const p = new URLSearchParams();
    for (const key of ["products", "compare", "product", "lang", "draft"]) {
      const v = url.searchParams.get(key);
      if (
        v &&
        (key === "lang"
          ? /^(ar|en)$/.test(v)
          : key === "draft"
            ? /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v)
            : /^[a-z0-9,-]{1,1500}$/.test(v))
      )
        p.set(key, v);
    }
    return url.pathname + (p.size ? `?${p}` : "");
  } catch {
    return fallback;
  }
}

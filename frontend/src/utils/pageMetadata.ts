import type { Lang } from "../i18n";

// Indexing remains closed until an operator supplies an approved HTTPS origin and opts in.
export function updatePageMetadata(path: string, lang: Lang) {
  const configured = import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined;
  let origin: string | undefined;
  try {
    const u = new URL(configured || "");
    if (u.protocol === "https:" && u.origin === configured) origin = u.origin;
  } catch {
    /* A local build has no public domain. */
  }
  const publicRoute =
    /^\/(?:products(?:\/[a-z0-9-]+)?|recipes(?:\/[a-z0-9-]+)?|about|business|contact|privacy|find-your-product)?$/.test(
      path,
    );
  const indexable =
    import.meta.env.PROD &&
    import.meta.env.VITE_PUBLIC_INDEXABLE === "true" &&
    !!origin &&
    publicRoute;
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.append(robots);
  }
  robots.content = indexable ? "index, follow" : "noindex, nofollow";
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (origin && publicRoute) {
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = origin + path + "?lang=" + lang;
  } else canonical?.remove();
}

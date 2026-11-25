import { BadRequestException } from "@nestjs/common";
import type { ContentBody, ContentKind } from "./content.entities.js";
export const bad = () => {
  throw new BadRequestException({ code: "CONTENT_FIELDS" });
};
export const identifier = (v: unknown, max = 64): v is string =>
  typeof v === "string" && v.length <= max && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
export function exact(o: any, keys: string[]) {
  if (
    !o ||
    typeof o !== "object" ||
    Array.isArray(o) ||
    Object.keys(o).some((k) => !keys.includes(k))
  )
    bad();
}
export function text(v: any, max = 6000, optional = false) {
  if (optional && v == null) return;
  if (typeof v !== "string" || v.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v)) bad();
}
export function imagePath(v: any) {
  if (v === null || v === "") return;
  if (
    typeof v !== "string" ||
    v.includes("..") ||
    !/^\/(?:assets\/[A-Za-z0-9/_.-]+|api\/v1\/media\/[a-f0-9-]{36}\.webp)$/.test(v)
  )
    bad();
}
function ids(a: any) {
  if (
    !Array.isArray(a) ||
    a.length > 100 ||
    a.some((x) => !identifier(x)) ||
    new Set(a).size !== a.length
  )
    bad();
}
const required = (...s: any[]) => {
  if (s.some((v) => typeof v !== "string" || !v.trim())) bad();
};
export function validateContent(kind: ContentKind, b: ContentBody, publish = false) {
  if (!b || typeof b !== "object" || Array.isArray(b)) bad();
  if (!identifier(b.id) || !identifier(b.slug)) bad();
  if (kind === "products") {
    exact(b, [
      "id",
      "slug",
      "nameAr",
      "nameEn",
      "descriptionAr",
      "descriptionEn",
      "ingredientsAr",
      "ingredientsEn",
      "ingredientsApproved",
      "brandKey",
      "categoryKey",
      "useKeys",
      "displayUseKeys",
      "referenceOrder",
      "featuredOrder",
      "image",
      "packages",
    ]);
    for (const k of ["nameAr", "nameEn"]) text(b[k], 200);
    for (const k of ["descriptionAr", "descriptionEn"]) text(b[k]);
    for (const k of ["ingredientsAr", "ingredientsEn"]) text(b[k], 4000, true);
    if (
      typeof b.ingredientsApproved !== "boolean" ||
      !identifier(b.brandKey) ||
      !identifier(b.categoryKey)
    )
      bad();
    ids(b.useKeys);
    ids(b.displayUseKeys);
    imagePath(b.image);
    if (
      !Number.isInteger(b.referenceOrder) ||
      b.referenceOrder < 0 ||
      b.referenceOrder > 1000000 ||
      !(
        b.featuredOrder === null ||
        (Number.isInteger(b.featuredOrder) && b.featuredOrder >= 0 && b.featuredOrder < 4)
      )
    )
      bad();
    if (!Array.isArray(b.packages) || b.packages.length > 30) bad();
    const seen = new Set();
    for (const p of b.packages) {
      exact(p, [
        "id",
        "position",
        "sizeKey",
        "sizeAr",
        "sizeEn",
        "amount",
        "unit",
        "packagingAr",
        "packagingEn",
        "packagingPublished",
        "published",
      ]);
      if (
        !identifier(p.id, 80) ||
        seen.has(p.id) ||
        !(
          typeof p.sizeKey === "string" &&
          /^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*$/.test(p.sizeKey) &&
          p.sizeKey.length <= 64
        ) ||
        !Number.isInteger(p.position) ||
        p.position < 0 ||
        p.position > 100
      )
        bad();
      seen.add(p.id);
      for (const k of ["sizeAr", "sizeEn"]) text(p[k], 100);
      for (const k of ["packagingAr", "packagingEn"]) text(p[k], 150, true);
      if (
        !(
          p.amount === null ||
          (typeof p.amount === "string" &&
            /^\d{1,7}(?:\.\d{1,3})?$/.test(p.amount) &&
            Number(p.amount) > 0)
        ) ||
        !(p.unit === null || ["g", "kg", "L"].includes(p.unit)) ||
        (p.amount === null) !== (p.unit === null) ||
        typeof p.published !== "boolean" ||
        typeof p.packagingPublished !== "boolean"
      )
        bad();
      if (publish && p.published) required(p.sizeAr, p.sizeEn);
      if (publish && p.packagingPublished) required(p.packagingAr, p.packagingEn);
    }
    if (publish) required(b.nameAr, b.nameEn, b.descriptionAr, b.descriptionEn);
    if (b.ingredientsApproved && publish) required(b.ingredientsAr, b.ingredientsEn);
  } else if (kind === "categories" || kind === "uses") {
    exact(b, ["id", "slug", "ar", "en"]);
    text(b.ar, 100);
    text(b.en, 100);
    if (publish) required(b.ar, b.en);
  } else if (kind === "recipes") {
    exact(b, [
      "id",
      "slug",
      "titleAr",
      "titleEn",
      "category",
      "descriptionAr",
      "descriptionEn",
      "productIds",
      "image",
      "ingredients",
      "stepsAr",
      "stepsEn",
      "knownTimeAr",
      "knownTimeEn",
      "temperatureC",
    ]);
    for (const k of ["titleAr", "titleEn"]) text(b[k], 200);
    for (const k of ["descriptionAr", "descriptionEn"]) text(b[k]);
    if (!["sweets-baking", "main-dishes"].includes(b.category)) bad();
    ids(b.productIds);
    imagePath(b.image);
    for (const k of ["knownTimeAr", "knownTimeEn"]) text(b[k], 1000, true);
    if (
      b.temperatureC !== undefined &&
      b.temperatureC !== null &&
      (!Number.isFinite(b.temperatureC) || b.temperatureC < 0 || b.temperatureC > 500)
    )
      bad();
    if (!Array.isArray(b.ingredients) || b.ingredients.length > 100) bad();
    for (const i of b.ingredients) {
      exact(i, ["amount", "unitAr", "unitEn", "nameAr", "nameEn"]);
      for (const k of ["unitAr", "unitEn"]) text(i[k], 100, true);
      for (const k of ["nameAr", "nameEn"]) text(i[k], 400);
      if (
        i.amount !== undefined &&
        i.amount !== null &&
        (!Number.isFinite(i.amount) || i.amount < 0 || i.amount > 1000000)
      )
        bad();
      if (publish) required(i.nameAr, i.nameEn);
    }
    for (const k of ["stepsAr", "stepsEn"]) {
      if (!Array.isArray(b[k]) || b[k].length > 100) bad();
      for (const s of b[k]) {
        text(s, 4000);
        if (publish) required(s);
      }
    }
    if (publish) {
      required(b.titleAr, b.titleEn, b.descriptionAr, b.descriptionEn, b.image);
      if (
        !b.ingredients.length ||
        !b.stepsAr.length ||
        !b.stepsEn.length ||
        b.stepsAr.length !== b.stepsEn.length
      )
        bad();
    }
  } else {
    exact(b, ["id", "slug", "texts", "images", "links", "featuredProductIds", "rows"]);
    if (
      !b.texts ||
      typeof b.texts !== "object" ||
      Array.isArray(b.texts) ||
      Object.keys(b.texts).length > 150
    )
      bad();
    for (const [key, v] of Object.entries(b.texts) as [string, any][]) {
      if (!identifier(key)) bad();
      exact(v, ["ar", "en"]);
      text(v.ar);
      text(v.en);
      if (publish) required(v.ar, v.en);
    }
    exact(b.links, Object.keys(b.links || {}));
    if (Object.keys(b.links || {}).length > 20) bad();
    for (const [k, v] of Object.entries(b.links)) {
      if (!identifier(k)) bad();
      text(v, 500);
      if (k === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v as string)) bad();
      } else if (["phone", "phone-secondary", "fax"].includes(k)) {
        if (!/^\+[\d ()-]{7,35}$/.test(v as string)) bad();
      } else {
        let u;
        try {
          u = new URL(v as string);
        } catch {
          bad();
        }
        if (u!.protocol !== "https:" || u!.username || u!.password) bad();
      }
    }
    exact(b.images, Object.keys(b.images || {}));
    if (Object.keys(b.images || {}).length > 30) bad();
    for (const [k, v] of Object.entries(b.images)) {
      if (!identifier(k)) bad();
      imagePath(v);
    }
    ids(b.featuredProductIds);
    if (b.featuredProductIds.length && b.featuredProductIds.length !== 4) bad();
    if (!Array.isArray(b.rows) || b.rows.length > 50) bad();
    for (const row of b.rows) {
      if (!Array.isArray(row) || row.length > 8) bad();
      row.forEach((v: any) => text(v, 6000));
      if (b.id === "about") {
        if (row.length !== 4) bad();
        imagePath(row[3]);
      }
      if (b.id === "home") {
        if (row.length !== 6) bad();
        imagePath(row[4]);
      }
      if (b.id === "business" && row.length !== 4) bad();
    }
  }
  if (Buffer.byteLength(JSON.stringify(b), "utf8") > 60000) bad();
}
export function mediaUrls(b: any): string[] {
  const urls = new Set<string>();
  const walk = (x: any) => {
    if (typeof x === "string" && /^\/(assets\/|api\/v1\/media\/)/.test(x)) urls.add(x);
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") Object.values(x).forEach(walk);
  };
  walk(b);
  return [...urls];
}

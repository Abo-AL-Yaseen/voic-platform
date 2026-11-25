import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import {
  CatalogProduct,
  CatalogPackage,
  CatalogTerm,
  CatalogTranslation,
} from "../catalog/catalog.entities.js";
import { ContentDocument, ContentRevision, ContentMedia } from "./content.entities.js";
import { contentKey, editorLock, recordRevision } from "./content.service.js";
import { validateContent } from "./content.validation.js";
// Explicit insert-only baseline import. It never updates an existing editorial document,
// published graph, media alt text or approval. Source/provenance notes stay out of public data.
export async function importDevelopmentContent(source: DataSource) {
  return source.transaction(async (m) => {
    await editorLock(m);
    let inserted = 0,
      skipped = 0,
      mediaInserted = 0;
    const labels: Record<string, [string, string]> = {};
    for (const p of JSON.parse(fs.readFileSync("data/catalog-baseline.json", "utf8")))
      if (p.image) labels[p.image] = [p.name, p.englishName];
    for (const r of JSON.parse(fs.readFileSync("data/recipes-baseline.json", "utf8")))
      labels[r.image] = [r.titleAr, r.titleEn];
    const pageInput = JSON.parse(fs.readFileSync("data/pages-baseline.json", "utf8"));
    for (const [page, image, key] of [
      ["home", "kunafa", "text-7"],
      ["home", "ghazal", "text-8"],
      ["home", "factory", "text-24"],
      ["home", "kawakeb", "text-30"],
      ["about", "factory", "text-57"],
      ["about", "quality", "text-67"],
      ["business", "hero", "text-43"],
    ] as const) {
      const p = pageInput.find((p: any) => p.id === page);
      labels[p.images[image]] = [p.texts[key].ar, p.texts[key].en];
    }
    labels["/assets/18972.png"] = ["شركة مصانع الزيوت النباتية", "Vegetable Oil Industries Co."];
    const register = async (url: string, altAr = "", altEn = "") => {
      [altAr, altEn] = labels[url] || [altAr, altEn];
      if (await m.existsBy(ContentMedia, { url })) return;
      await m.insert(ContentMedia, {
        id: "asset-" + createHash("sha256").update(url).digest("hex").slice(0, 32),
        url,
        filename: null,
        source: "original",
        altAr,
        altEn,
        version: 1,
        archived: false,
        createdAt: new Date(),
      });
      mediaInserted++;
    };
    const root = path.resolve("../frontend/public/assets");
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walk(f);
        else if (e.isFile() && /\.(png|jpe?g|webp|svg)$/i.test(e.name))
          assets.push("/assets/" + path.relative(root, f).split(path.sep).join("/"));
      }
    };
    const assets: string[] = [];
    walk(root);
    for (const url of assets) await register(url);
    const add = async (
      kind: any,
      body: any,
      published = true,
      scope: "development" | "approved" = "development",
    ) => {
      const key = contentKey(kind, body.id);
      if (await m.existsBy(ContentDocument, { key })) {
        skipped++;
        return;
      }
      validateContent(kind, body);
      const d = m.create(ContentDocument, {
        key,
        kind,
        id: body.id,
        slug: body.slug,
        version: 1,
        draftId: randomUUID(),
        publishedId: null,
        reviewId: null,
        approvedBy: null,
        approvalScope: scope,
        archived: false,
        updatedAt: new Date(),
      });
      await m.insert(ContentDocument, d);
      const r = await recordRevision(m, d, body, null);
      d.draftId = r.id;
      d.publishedId = published ? r.id : null;
      await m.save(d);
      inserted++;
    };
    for (const p of await m.find(CatalogProduct, { order: { referenceOrder: "ASC", id: "ASC" } })) {
      const tr = await m.find(CatalogTranslation, { where: { productId: p.id } }),
        packs = await m.find(CatalogPackage, {
          where: { productId: p.id },
          order: { position: "ASC", id: "ASC" },
        });
      const f = (locale: string, key: string) =>
        (tr.find((t) => t.locale === locale)?.fields as any)?.[key]?.value || "";
      if (p.image) await register(p.image, f("ar", "name"), f("en", "name"));
      await add(
        "products",
        {
          id: p.id,
          slug: p.slug,
          nameAr: f("ar", "name"),
          nameEn: f("en", "name"),
          descriptionAr: f("ar", "description"),
          descriptionEn: f("en", "description"),
          ingredientsAr: f("ar", "ingredients") || null,
          ingredientsEn: f("en", "ingredients") || null,
          ingredientsApproved: tr.every((t) => t.fields.ingredients.published),
          brandKey: p.brandKey,
          categoryKey: p.categoryKey,
          useKeys: p.useKeys,
          displayUseKeys: p.displayUseKeys,
          referenceOrder: p.referenceOrder,
          featuredOrder: p.featuredOrder,
          image: p.image,
          packages: packs.map((x) => ({
            id: x.id,
            position: x.position,
            sizeKey: x.sizeKey,
            amount: x.amount,
            unit: x.unit,
            sizeAr: x.sizeAr,
            sizeEn: x.sizeEn,
            packagingAr: x.packagingAr,
            packagingEn: x.packagingEn,
            packagingPublished: x.packagingPublished,
            published: x.published,
          })),
        },
        p.published,
        p.approvalScope,
      );
    }
    for (const t of await m.find(CatalogTerm))
      if (t.kind !== "brand")
        await add(
          t.kind === "category" ? "categories" : "uses",
          { id: t.id, slug: t.id, ar: t.ar, en: t.en },
          t.published,
        );
    const recipes = JSON.parse(fs.readFileSync("data/recipes-baseline.json", "utf8"));
    for (const r of recipes) await add("recipes", r);
    const pages = JSON.parse(fs.readFileSync("data/pages-baseline.json", "utf8"));
    for (const b of pages) {
      if (b.id === "home")
        b.featuredProductIds = (await m.find(CatalogProduct, { order: { featuredOrder: "ASC" } }))
          .filter((p) => p.featuredOrder !== null)
          .map((p) => p.id)
          .slice(0, 4);
      await add("pages", b);
    }
    return { inserted, skipped, mediaInserted };
  });
}

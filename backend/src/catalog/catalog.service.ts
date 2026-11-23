import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
import { In, type DataSource } from "typeorm";
import { DATABASE_SOURCE, DatabaseService } from "../database/database.service.js";
import { ENVIRONMENT } from "../config/configuration.module.js";
import type { Environment } from "../config/environment.js";
import {
  CatalogProduct,
  CatalogTranslation,
  CatalogTerm,
  CatalogPackage,
  type Locale,
} from "./catalog.entities.js";
import { normalize, type CatalogQuery } from "./catalog.query.js";

export type PublicProduct = {
  id: string;
  slug: string;
  translationAvailable: boolean;
  availableLocales: Locale[];
  name: string;
  englishName: string;
  description: string;
  descriptionEn: string;
  brand: string;
  brandEn: string;
  brandKey: string;
  category: string;
  categoryKey: string;
  categoryLabel: string;
  useKeys: string[];
  uses: string[];
  useLabels: Record<string, string>;
  sizes: string[];
  packaging?: string[];
  image?: string;
  ingredientsAr?: string;
  ingredientsEn?: string;
  sizeLabels: Record<string, string>;
  packagingLabels: Record<string, string>;
  packageOptions: { id: string; label: string }[];
};

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DATABASE_SOURCE) private readonly source: DataSource,
    private readonly database: DatabaseService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  private async snapshot(lang: Locale) {
    if (!(await this.database.isReady())) throw new ServiceUnavailableException();
    try {
      return await this.source.transaction("REPEATABLE READ", async (manager) => {
        const rows = await manager.find(CatalogProduct, {
          where:
            this.env.nodeEnv === "production"
              ? { published: true, approvalScope: "approved" }
              : { published: true, approvalScope: In(["development", "approved"]) },
          order: { referenceOrder: "ASC", id: "ASC" },
        });
        const translations = await manager.find(CatalogTranslation, { where: { published: true } });
        const terms = await manager.find(CatalogTerm, { where: { published: true } });
        const packages = await manager.find(CatalogPackage, {
          where: { published: true },
          order: { position: "ASC", id: "ASC" },
        });
        const term = (kind: string, id: string) =>
          terms.find((t) => t.kind === kind && t.id === id);
        const projected = rows.flatMap((row) => {
          const category = term("category", row.categoryKey),
            brand = term("brand", row.brandKey);
          if (!category || !brand) return [];
          const tr = (locale: Locale) =>
            translations.find((t) => t.productId === row.id && t.locale === locale);
          const field = (locale: Locale, key: "name" | "description" | "ingredients") => {
            const f = tr(locale)?.fields[key];
            return f?.published ? (f.value ?? "") : "";
          };
          const availableLocales = (["ar", "en"] as Locale[]).filter(
            (l) => field(l, "name") && field(l, "description"),
          );
          const available = availableLocales.includes(lang);
          const pack = packages.filter(
            (p) => p.productId === row.id && p[lang === "ar" ? "sizeAr" : "sizeEn"],
          );
          const useKeys = row.useKeys.filter((id) => term("usage", id));
          const displayUses = row.displayUseKeys.filter((id) => term("usage", id));
          const product: PublicProduct = {
            id: row.id,
            slug: row.slug,
            translationAvailable: available,
            availableLocales,
            name: field("ar", "name"),
            englishName: field("en", "name"),
            description: field("ar", "description"),
            descriptionEn: field("en", "description"),
            brand: brand.ar,
            brandEn: brand.en,
            brandKey: brand.id,
            category: category.ar,
            categoryKey: category.id,
            categoryLabel: category[lang],
            useKeys,
            useLabels: Object.fromEntries(useKeys.map((id) => [id, term("usage", id)![lang]])),
            uses: displayUses.map((id) => term("usage", id)!.ar),
            sizes: [...new Set(pack.map((p) => p.sizeAr))],
            packageOptions: pack
              .filter((p) => p.amount !== null && p.unit !== null)
              .map((p) => ({
                id: p.id,
                label: [
                  lang === "ar" ? p.sizeAr : p.sizeEn,
                  p.packagingPublished ? (lang === "ar" ? p.packagingAr : p.packagingEn) : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
              })),
            sizeLabels: Object.fromEntries(
              pack.map((p) => [p.sizeAr, lang === "ar" ? p.sizeAr : p.sizeEn]),
            ),
            packagingLabels: Object.fromEntries(
              pack
                .filter(
                  (p) => p.packagingPublished && p.packagingAr && (lang === "ar" || p.packagingEn),
                )
                .map((p) => [p.packagingAr!, lang === "ar" ? p.packagingAr! : p.packagingEn!]),
            ),
            ...(pack.some(
              (p) => p.packagingPublished && p.packagingAr && (lang === "ar" || p.packagingEn),
            )
              ? {
                  packaging: pack
                    .filter(
                      (p) =>
                        p.packagingPublished && p.packagingAr && (lang === "ar" || p.packagingEn),
                    )
                    .map((p) => p.packagingAr!),
                }
              : {}),
            ...(row.imagePublished &&
            row.image &&
            !row.image.includes("..") &&
            /^\/assets\/[a-zA-Z0-9/_.-]+$/.test(row.image)
              ? { image: row.image }
              : {}),
            ...(field("ar", "ingredients") ? { ingredientsAr: field("ar", "ingredients") } : {}),
            ...(field("en", "ingredients") ? { ingredientsEn: field("en", "ingredients") } : {}),
          };
          // Missing essential translation retains identity/counts, with no implicit fallback.
          if (!available) {
            product.name = "";
            product.englishName = "";
            product.description = "";
            product.descriptionEn = "";
            product.sizes = [];
            product.packageOptions = [];
            product.useKeys = [];
            product.uses = [];
            product.useLabels = {};
            product.sizeLabels = {};
            product.packagingLabels = {};
            delete product.packaging;
            delete product.ingredientsAr;
            delete product.ingredientsEn;
            delete product.image;
          }
          const aliases = (["ar", "en"] as Locale[]).flatMap((l) => {
            const f = tr(l)?.fields.aliases;
            return f?.published ? f.value : [];
          });
          const search = normalize(
            [
              field("ar", "name"),
              field("en", "name"),
              field("ar", "description"),
              field("en", "description"),
              brand.ar,
              brand.en,
              category.ar,
              category.en,
              ...aliases,
            ].join(" "),
          );
          return [{ product, search, row, pack, displayUses, useKeys }];
        });
        return { projected, terms };
      });
    } catch {
      throw new ServiceUnavailableException();
    }
  }

  private async matching(query: CatalogQuery) {
    const snapshot = await this.snapshot(query.lang);
    const all = snapshot.projected;
    const resolve = (kind: "brand" | "category" | "usage", values: string[]) =>
      values.map((v) => {
        const t = snapshot.terms.find(
          (t) =>
            t.kind === kind &&
            [t.id, t.ar, t.en].includes(v) &&
            all.some((p) =>
              kind === "usage"
                ? [...p.displayUses, ...p.useKeys].includes(t.id)
                : p.row[kind === "brand" ? "brandKey" : "categoryKey"] === t.id,
            ),
        );
        if (!t) throw new BadRequestException();
        return t.id;
      });
    const category = resolve("category", query.category),
      brand = resolve("brand", query.brand);
    const usage = resolve("usage", query.usage),
      use = resolve("usage", query.use);
    const sizes = query.size.map((v) => {
      const p = all.flatMap((p) => p.pack).find((p) => [p.sizeKey, p.sizeAr, p.sizeEn].includes(v));
      if (!p) throw new BadRequestException();
      return p.sizeKey;
    });
    const any = (wanted: string[], actual: string[]) =>
      !wanted.length || wanted.some((v) => actual.includes(v));
    const matching = all.filter(
      (p) =>
        p.search.includes(query.q) &&
        any(category, [p.row.categoryKey]) &&
        any(brand, [p.row.brandKey]) &&
        any(usage, p.displayUses) &&
        any(use, p.useKeys) &&
        any(
          sizes,
          p.pack.map((p) => p.sizeKey),
        ),
    );
    matching.sort((a, b) =>
      query.sort === "reference"
        ? a.row.referenceOrder - b.row.referenceOrder || a.product.id.localeCompare(b.product.id)
        : a.product.name.localeCompare(b.product.name, "ar") * (query.sort === "desc" ? -1 : 1) ||
          a.product.id.localeCompare(b.product.id),
    );
    return { matching, all, terms: snapshot.terms };
  }

  async list(query: CatalogQuery) {
    const { matching, all } = await this.matching(query);
    const total = matching.length,
      pages = Math.max(1, Math.ceil(total / query.pageSize));
    return {
      items:
        query.page > pages
          ? []
          : matching
              .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
              .map((p) => p.product),
      total,
      totalPublished: all.length,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: pages,
      invalidPage: query.page > pages,
      nextPage: query.page < pages ? query.page + 1 : null,
    };
  }
  async detail(id: string, lang: Locale) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64) throw new NotFoundException();
    const { projected } = await this.snapshot(lang);
    const match = projected.find((p) => p.product.id === id || p.product.slug === id);
    if (!match) throw new NotFoundException();
    return match.product;
  }
  async lookup(ids: string[], lang: Locale) {
    if (!ids.length) throw new BadRequestException();
    const { projected } = await this.snapshot(lang);
    const items = ids.flatMap((id) =>
      projected.filter((p) => p.product.id === id).map((p) => p.product),
    );
    return { items, unavailableIds: ids.filter((id) => !items.some((p) => p.id === id)) };
  }
  async featured(lang: Locale) {
    const { projected } = await this.snapshot(lang);
    return {
      items: projected
        .filter((p) => p.row.featuredOrder !== null)
        .sort(
          (a, b) =>
            a.row.featuredOrder! - b.row.featuredOrder! || a.product.id.localeCompare(b.product.id),
        )
        .slice(0, 4)
        .map((p) => p.product),
    };
  }
  async related(id: string, lang: Locale) {
    const { projected } = await this.snapshot(lang);
    const p = projected.find((p) => p.product.id === id || p.product.slug === id);
    if (!p) throw new NotFoundException();
    return {
      items: projected
        .filter(
          (other) =>
            other !== p &&
            (p.row.categoryKey === other.row.categoryKey ||
              p.useKeys.some((key) => other.useKeys.includes(key))),
        )
        .slice(0, 3)
        .map((p) => p.product),
    };
  }
  async filters(query: CatalogQuery) {
    const { matching, terms } = await this.matching(query);
    const groups = (["category", "brand", "usage"] as const).map((kind) => ({
      key: kind,
      choices: terms
        .filter(
          (t) =>
            t.kind === kind &&
            matching.some((p) =>
              kind === "usage"
                ? p.displayUses.includes(t.id)
                : p.row[kind === "brand" ? "brandKey" : "categoryKey"] === t.id,
            ),
        )
        .sort((a, b) => a.ar.localeCompare(b.ar, "ar") || a.id.localeCompare(b.id))
        .map((t) => ({ value: t.id, label: t[query.lang], legacyValues: [t.ar, t.en] })),
    }));
    const packs = matching
      .flatMap((p) => p.pack)
      .sort((a, b) => {
        const group = Number(a.unit === "L") - Number(b.unit === "L");
        if (group) return group;
        const amount = (p: CatalogPackage) =>
          p.amount === null ? Infinity : Number(p.amount) * (p.unit === "kg" ? 1000 : 1);
        return amount(a) - amount(b) || a.sizeKey.localeCompare(b.sizeKey);
      });
    return {
      recommendationUses: terms
        .filter((t) => t.kind === "usage" && matching.some((p) => p.useKeys.includes(t.id)))
        .sort((a, b) => a.ar.localeCompare(b.ar, "ar") || a.id.localeCompare(b.id))
        .map((t) => ({ value: t.id, label: t[query.lang], legacyValues: [t.ar, t.en] })),
      groups: [
        ...groups,
        {
          key: "size",
          choices: [
            ...new Map(
              packs.map((p) => [
                p.sizeKey,
                {
                  value: p.sizeKey,
                  label: query.lang === "ar" ? p.sizeAr : p.sizeEn,
                  legacyValues: [p.sizeAr, p.sizeEn],
                },
              ]),
            ).values(),
          ],
        },
      ],
    };
  }
}

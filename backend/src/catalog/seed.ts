import fs from "node:fs";
import { resolve } from "node:path";
import type { DataSource } from "typeorm";
import {
  CatalogProduct,
  CatalogTerm,
  CatalogTranslation,
  CatalogPackage,
  type PublicField,
} from "./catalog.entities.js";

const categories: Record<string, [string, string]> = {
  "vegetable-ghee": ["سمن نباتي", "Vegetable ghee"],
  "soybean-oil": ["زيت صويا", "Soybean oil"],
  "corn-oil": ["زيت ذرة", "Corn oil"],
  "sunflower-oil": ["زيت دوار الشمس", "Sunflower oil"],
};
const uses: Record<string, [string, string]> = {
  cooking: ["الطبخ", "Cooking"],
  frying: ["القلي", "Frying"],
  "oriental-sweets": ["الحلويات الشرقية", "Traditional sweets"],
  kunafa: ["الكنافة", "Kunafa"],
  desserts: ["الحلويات", "Desserts"],
  baking: ["المخبوزات", "Baking & pastries"],
  "food-industry": ["الاستخدام المهني", "Food-industry use"],
  salads: ["السلطات", "Salads"],
  pastry: ["المعجنات", "Pastries"],
};
type Baseline = {
  id: string;
  slug: string;
  name: string;
  englishName: string;
  brand: string;
  brandEn: string;
  categoryKey: string;
  description: string;
  descriptionEn: string;
  useKeys: string[];
  uses: string[];
  sizes: string[];
  packaging?: string[];
  image?: string;
  aliases?: string[];
  ingredientsAr?: string;
  ingredientsEn?: string;
};
export const baseline = (): Baseline[] =>
  JSON.parse(fs.readFileSync(resolve("data/catalog-baseline.json"), "utf8"));
export const sizeKey = (label: string) =>
  label.replace("كغم", "kg").replace("غم", "g").replace("لتر", "L").replaceAll(" ", "-");
const english = (value: string) =>
  value
    .replace("كغم", "kg")
    .replace("غم", "g")
    .replace("لتر", "L")
    .replace("تنك", "tin")
    .replace("برميل", "drum")
    .replace("كرتون", "carton");

/** Insert missing product graphs only. Never UPDATE, DELETE, upsert or synchronize. */
export async function seedCatalog(
  source: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  return source.transaction(async (manager) => {
    let inserted = 0,
      skipped = 0;
    const addTerm = async (kind: CatalogTerm["kind"], id: string, labels: [string, string]) => {
      if (!(await manager.existsBy(CatalogTerm, { kind, id })))
        await manager.insert(CatalogTerm, {
          kind,
          id,
          ar: labels[0],
          en: labels[1],
          published: true,
        });
    };
    for (const [index, p] of baseline().entries()) {
      if (await manager.existsBy(CatalogProduct, { id: p.id })) {
        skipped++;
        continue;
      }
      const brandKey = p.brandEn.toLowerCase().replaceAll(" ", "-");
      await addTerm("category", p.categoryKey, categories[p.categoryKey]!);
      await addTerm("brand", brandKey, [p.brand, p.brandEn]);
      const displayUseKeys = p.uses.map((label) => {
        const key = Object.keys(uses).find((key) => uses[key]![0] === label);
        if (!key) throw new Error("Unknown baseline usage");
        return key;
      });
      for (const key of new Set([...p.useKeys, ...displayUseKeys]))
        await addTerm("usage", key, uses[key]!);
      await manager.insert(CatalogProduct, {
        id: p.id,
        slug: p.slug,
        categoryKey: p.categoryKey,
        brandKey,
        useKeys: p.useKeys,
        displayUseKeys,
        referenceOrder: index,
        featuredOrder: index < 4 ? index : null,
        published: true,
        approvalScope: "development",
        image: p.image ?? null,
        imagePublished: !!p.image,
        privateNotes: null,
      });
      const field = (value?: string, published = true): PublicField => ({
        value: value ?? null,
        published: !!value && published,
      });
      for (const locale of ["ar", "en"] as const)
        await manager.insert(CatalogTranslation, {
          productId: p.id,
          locale,
          published: true,
          fields: {
            name: field(locale === "ar" ? p.name : p.englishName),
            description: field(locale === "ar" ? p.description : p.descriptionEn),
            // Preserve source values, but source presence does not approve ingredients.
            ingredients: field(locale === "ar" ? p.ingredientsAr : p.ingredientsEn, false),
            aliases: { value: p.aliases ?? [], published: true },
          },
        });
      const packages = p.packaging ?? p.sizes;
      for (const [position, label] of packages.entries()) {
        const size = p.sizes.find((s) => label === s || label.startsWith(`${s} —`));
        if (!size) throw new Error("Unknown baseline package size");
        const match = /^(\d+(?:\.\d+)?) (كغم|غم|لتر)$/.exec(size);
        await manager.insert(CatalogPackage, {
          id: `${p.id}-${position + 1}`,
          productId: p.id,
          position,
          sizeKey: sizeKey(size),
          amount: match?.[1] ?? null,
          unit: match
            ? ({ كغم: "kg", غم: "g", لتر: "L" } as Record<string, string>)[match[2]!]!
            : null,
          sizeAr: size,
          sizeEn: english(size),
          packagingAr: p.packaging ? label : null,
          packagingEn: p.packaging ? english(label) : null,
          published: true,
          packagingPublished: !!p.packaging,
        });
      }
      inserted++;
    }
    return { inserted, skipped };
  });
}

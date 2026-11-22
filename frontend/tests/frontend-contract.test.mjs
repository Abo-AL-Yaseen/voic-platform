import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("featured products retain the approved order", async () => {
  const catalog = await read("src/catalog.ts");
  assert.match(catalog, /const featuredIds = \["ghazal-butter", "nabateen", "kawakeb", "ghazal"\]/);
});

test("all approved product and recipe records remain present", async () => {
  const [catalog, recipes] = await Promise.all([read("src/catalog.ts"), read("src/recipes.ts")]);
  for (const id of [
    "ghazal-butter",
    "nabateen",
    "kawakeb",
    "ghazal",
    "balqa",
    "mumtaz",
    "aseel",
    "kawkab-soybean-oil",
    "ghazalein-corn-oil",
    "reem-sunflower-oil",
    "sun-gold-sunflower-oil",
  ]) {
    assert.match(catalog, new RegExp(`id: "${id}"`));
  }
  for (const slug of [
    "semolina-maamoul",
    "qidra-with-lamb",
    "shishbarak-with-yogurt",
    "fish-with-vegetables",
  ]) {
    assert.match(recipes, new RegExp(`slug: "${slug}"`));
  }
});

test("locale and preview routing contracts are explicit", async () => {
  const [app, i18n] = await Promise.all([read("src/App.tsx"), read("src/i18n.ts")]);
  assert.match(i18n, /export type Lang = "ar" \| "en";/);
  assert.match(app, /path === "\/login"/);
  assert.match(app, /path === "\/inquiries\/new"/);
  assert.match(app, /path === "\/privacy"/);
  assert.match(app, /import\.meta\.env\.MODE !== "production"[\s\S]*path === "\/__preview"/);
});

test("private credentials and roles are not persisted in browser storage", async () => {
  const files = await Promise.all([
    read("src/App.tsx"),
    read("src/pages/AuthPages.tsx"),
    read("src/pages/AccountPages.tsx"),
    read("src/pages/NewInquiryPage.tsx"),
    read("src/pages/StaffPages.tsx"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /fetch\s*\(/);
});

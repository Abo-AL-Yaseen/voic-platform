import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadSourceModule(path) {
  const source = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

const i18n = await loadSourceModule("i18n.ts");
const { products } = await loadSourceModule("catalog.ts");

test("only Arabic and English are selectable and unsupported links use Arabic RTL", () => {
  assert.deepEqual(Object.keys(i18n.localeName), ["ar", "en"]);
  assert.deepEqual(Object.keys(i18n.ui), ["ar", "en"]);
  for (const locale of [null, "", "ar", "de", "fr", "unknown"]) {
    assert.equal(i18n.resolveLang(locale), "ar");
    assert.equal(i18n.direction(i18n.resolveLang(locale)), "rtl");
    assert.equal(i18n.pick(i18n.resolveLang(locale), "منتجاتنا", "Products"), "منتجاتنا");
  }
  assert.equal(i18n.resolveLang("en"), "en");
  assert.equal(i18n.direction("en"), "ltr");
  assert.equal(i18n.pick("en", "منتجاتنا", "Products"), "Products");
});

test("legacy locale links retain product, filters and comparison when navigating", () => {
  const originalWindow = globalThis.window;
  globalThis.window = { location: { origin: "https://voic.example" } };
  try {
    const original = new URL(
      "/products/ghazal?lang=de&usage=الطبخ&compare=ghazal&compare=nabateen#details",
      window.location.origin,
    );
    const locale = i18n.resolveLang(original.searchParams.get("lang"));
    const fallback = new URL(i18n.withLang(original.href, locale), original.origin);
    assert.equal(fallback.pathname, "/products/ghazal");
    assert.equal(fallback.searchParams.has("lang"), false);
    assert.equal(fallback.searchParams.get("usage"), "الطبخ");
    assert.deepEqual(fallback.searchParams.getAll("compare"), ["ghazal", "nabateen"]);
    assert.equal(fallback.hash, "#details");
    const english = new URL(i18n.withLang(fallback.href, "en"), original.origin);
    assert.equal(english.searchParams.get("lang"), "en");
    assert.equal(english.pathname, fallback.pathname);
    assert.equal(english.searchParams.get("usage"), "الطبخ");
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("product brand names retain approved Arabic and official Latin spellings", () => {
  const approved = {
    "ghazal-butter": ["الغزال", "Al-Ghazal"],
    nabateen: ["النباتين", "Al-Nabatin"],
    kawakeb: ["الكواكب", "Al-Kawakib"],
    ghazal: ["الغزال", "Al-Ghazal"],
    balqa: ["البلقاء", "Al-Balqa"],
    mumtaz: ["الممتاز", "Al-Mumtaz"],
    aseel: ["الأصيل", "Al-Aseel"],
    "kawkab-soybean-oil": ["الكوكب", "Al-Kawkab"],
    "ghazalein-corn-oil": ["الغزالين", "Al-Ghazalein"],
    "reem-sunflower-oil": ["ريم", "Reem"],
    "sun-gold-sunflower-oil": ["صن غولد", "Sun Gold"],
  };
  assert.equal(products.length, Object.keys(approved).length);
  for (const product of products) {
    assert.deepEqual([product.brand, product.brandEn], approved[product.id]);
    assert.equal(i18n.productName(product, "ar"), product.name);
    assert.equal(i18n.productName(product, "en"), product.englishName);
  }
});

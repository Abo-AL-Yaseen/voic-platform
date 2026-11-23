import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
async function load(path) {
  const source = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { scopeFromSearch, uniqueProductIds, decodeRouteSegment } =
  await load("utils/productScope.ts");
const { productKeys } = await load("hooks/products/keys.ts");
test("all request-affecting parameters change product query identity; URL-only selection does not", () => {
  const base = scopeFromSearch("", "ar"),
    key = productKeys.list(base);
  for (const search of [
    "?q=ghee",
    "?category=vegetable-ghee",
    "?brand=al-ghazal",
    "?usage=cooking",
    "?size=15-kg",
    "?sort=desc",
    "?page=2",
  ])
    assert.notDeepEqual(productKeys.list(scopeFromSearch(search, "ar")), key);
  assert.notDeepEqual(productKeys.list(scopeFromSearch("", "en")), key);
  assert.deepEqual(scopeFromSearch("?product=ghazal&compare=nabateen", "ar"), base);
  assert.equal(scopeFromSearch("?sort=unknown", "ar").sort, "asc");
  assert.deepEqual(uniqueProductIds(["ghazal", "ghazal", "", "nabateen"]), ["ghazal", "nabateen"]);
  assert.equal(decodeRouteSegment("%broken"), "invalid/route");
});
test("public product code cannot import the disconnected staff fixture or local product records", async () => {
  for (const path of [
    "App.tsx",
    "Pages.tsx",
    "ProductsPage.tsx",
    "InquiryForm.tsx",
    "ProductQuickView.tsx",
    "pages/NewInquiryPage.tsx",
  ]) {
    const source = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from ["'][^"']*(?:staff-catalog|catalog-baseline)["']/);
    assert.doesNotMatch(source, /import\s*\{[^}]*\bproducts\b[^}]*\}\s*from ["'][^"']*catalog["']/);
  }
});

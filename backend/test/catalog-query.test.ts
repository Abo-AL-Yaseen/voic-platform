import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, parseCatalogQuery } from "../src/catalog/catalog.query.js";
test("catalog query normalizes Arabic, defaults locale, and bounds untrusted input", () => {
  assert.equal(normalize(" أَلْغَـزَال "), "الغزال");
  const allowed = ["q", "page", "pageSize", "lang", "sort", "ids"];
  assert.equal(parseCatalogQuery({ lang: "de" }, allowed).lang, "ar");
  assert.equal(parseCatalogQuery({}, allowed).pageSize, 6);
  assert.deepEqual(parseCatalogQuery({ ids: ["ghazal", "ghazal"] }, allowed).ids, ["ghazal"]);
  for (const raw of [
    { page: "0" },
    { pageSize: "51" },
    { q: {} },
    { sort: "unknown" },
    { lang: ["ar", "en"] },
    { ids: ["x".repeat(65)] },
    { x: "bad" },
  ])
    assert.throws(() => parseCatalogQuery(raw, allowed));
});

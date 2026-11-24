import { test, expect } from "@playwright/test";
import fs from "node:fs";

const baseline: {
  id: string;
  slug: string;
  name: string;
  englishName: string;
  sizes: string[];
  useKeys: string[];
}[] = JSON.parse(
  fs.readFileSync(new URL("../../backend/data/catalog-baseline.json", import.meta.url), "utf8"),
);
const cards = ".catalog-results .catalog-card";

test("real API read contracts: combined filters, normalization, three pages, bounds and safe projection", async ({
  request,
}) => {
  const get = async (path: string, status = 200) => {
    const response = await request.get(
      `${process.env.VOIC_E2E_API_URL || "http://127.0.0.1:3000"}/api/v1/products${path}`,
    );
    expect(response.status()).toBe(status);
    return response.json();
  };
  const result = await get(
    "?category=vegetable-ghee&brand=al-kawakib&brand=al-mumtaz&usage=cooking&size=15-kg",
  );
  expect(new Set(result.items.map((p: { id: string }) => p.id))).toEqual(
    new Set(["kawakeb", "mumtaz"]),
  );
  expect((await get("?q=" + encodeURIComponent(" اَلْغَــزَال "))).total).toBe(3);
  expect((await get("?q=%27%20OR%201%3D1%20--")).total).toBe(0);
  const ids: string[] = [];
  for (let page = 1; page <= 3; page++)
    ids.push(...(await get(`?pageSize=4&page=${page}`)).items.map((p: { id: string }) => p.id));
  expect(new Set(ids)).toEqual(new Set(baseline.map((p) => p.id)));
  expect((await get("?page=999")).invalidPage).toBe(true);
  const lookup = await get("/lookup?ids=reem-sunflower-oil&ids=missing&ids=ghazal&ids=ghazal");
  expect(lookup.items.map((p: { id: string }) => p.id)).toEqual(["reem-sunflower-oil", "ghazal"]);
  expect(lookup.unavailableIds).toEqual(["missing"]);
  const detail = await get("/ghazal");
  for (const key of [
    "privateNotes",
    "approvalScope",
    "ingredientsAr",
    "ingredientsEn",
    "aliases",
    "published",
  ])
    expect(detail).not.toHaveProperty(key);
  expect((await get("?lang=de")).items[0].name).toBe((await get("?lang=ar")).items[0].name);
  for (const path of [
    "?page=0",
    "?pageSize=51",
    "?category=unknown",
    "?lang=ar&lang=en",
    "?unknown=x",
    "/lookup",
  ])
    expect((await get(path, 400)).code).toBe("BAD_REQUEST");
});

test("real API: all 11 direct product links and quick views in Arabic and English", async ({
  page,
}) => {
  // This regression performs 44 full navigations; retain bounded per-assertion waits
  // while allowing the complete two-language catalog sweep on a busy workstation.
  test.setTimeout(120_000);
  for (const lang of ["ar", "en"])
    for (const p of baseline) {
      await page.goto(`/products/${p.slug}?lang=${lang}`);
      await expect(page.locator("main h1")).toHaveText(lang === "ar" ? p.name : p.englishName);
      await page.goto(`/products?product=${p.id}&lang=${lang}`);
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").getByRole("heading", { level: 2 })).toHaveText(
        lang === "ar" ? p.name : p.englishName,
      );
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
});

test("real API: pagination, independent comparison/inquiry selection, filter reset and browser history", async ({
  page,
}) => {
  await page.goto("/products?lang=en");
  await expect(page.locator(cards)).toHaveCount(6);
  const firstName = await page.locator(cards).first().locator("h3").innerText();
  await page.locator(cards).first().getByRole("checkbox").check();
  for (let i = 0; i < 4; i++)
    await page
      .locator(cards)
      .nth(i)
      .getByRole("button", { name: "Add to inquiry", exact: true })
      .click();
  await page
    .getByRole("navigation", { name: "Result pages" })
    .getByRole("button", { name: "Next" })
    .click();
  await expect(page.locator(cards)).toHaveCount(5);
  const secondName = await page.locator(cards).first().locator("h3").innerText();
  await page.locator(cards).first().getByRole("checkbox").check();
  await page.getByLabel("Search products", { exact: true }).fill("no-match-voic");
  await expect(page.getByRole("heading", { name: "No products match your search" })).toBeVisible();
  await expect(page.locator(".comparison-bar")).toContainText(firstName);
  await expect(page.locator(".comparison-bar")).toContainText(secondName);
  await page.getByRole("button", { name: "Compare products", exact: true }).click();
  await expect(page.locator(".comparison-table thead th")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await page
    .locator(".catalog-results-heading")
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(cards)).toHaveCount(6);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "No products match your search" })).toBeVisible();
  await page.goForward();
  await expect(page.locator(cards)).toHaveCount(6);
  await page.getByRole("button", { name: "Continue inquiry", exact: true }).click();
  await expect(page.locator(".inquiry-product.selected")).toHaveCount(4);
  expect(new URL(page.url()).searchParams.get("products")!.split(",")).toHaveLength(4);
});

test("real API: homepage order, chooser full catalog, business and recipe relationships", async ({
  page,
}) => {
  await page.goto("/?lang=en");
  await expect(page.locator("#product-list .product-card h3")).toHaveText(
    baseline.slice(0, 4).map((p) => p.englishName),
  );
  await page.goto("/find-your-product?lang=en");
  await page.getByRole("button", { name: "For home", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Cooking", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "No preference", exact: true }).click();
  await page.getByRole("button", { name: "See results", exact: true }).click();
  await expect(page.locator(".chooser-results .product-card")).toHaveCount(
    baseline.filter((p) => p.useKeys.includes("cooking")).length,
  );
  await page.goto("/business?lang=en");
  await expect(page.locator(".professional-row")).toHaveCount(6);
  await page.goto("/recipes/semolina-maamoul?lang=en");
  await expect(page.locator(".recipe-products .product-card")).not.toHaveCount(0);
  await page.goto("/contact?lang=en");
  await expect(page.locator(".product-picks input[type=checkbox]")).toHaveCount(11);
});

test("loading, safe API failure/retry, empty and not-found are distinct", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/products?*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/products?lang=en");
  await expect(
    page.locator(".catalog-results").getByText("Loading products…", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "No products match your search" })).toHaveCount(0);
  release();
  await expect(page.locator(cards)).toHaveCount(6);
  await page.unroute("**/api/v1/products?*");
  await page.route("**/api/v1/products?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"statusCode":503,"code":"SERVICE_UNAVAILABLE"}',
    }),
  );
  await page.getByLabel("Search products", { exact: true }).fill("new-context");
  await expect(
    page.getByText("Could not load products. Please try again.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(cards)).toHaveCount(0);
  await page.unroute("**/api/v1/products?*");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No products match your search" })).toBeVisible();
  await page.goto("/products/unknown?lang=en");
  await expect(page.getByText("Product not found or unavailable.", { exact: true })).toBeVisible();
  await page.route("**/api/v1/products?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        total: 0,
        totalPublished: 0,
        page: 1,
        pageSize: 6,
        totalPages: 1,
        invalidPage: false,
        nextPage: null,
      }),
    }),
  );
  await page.goto("/products?lang=en");
  await expect(page.getByRole("heading", { name: "No published products yet" })).toBeVisible();
});

test("legacy filters, unknown filter handling, reset context, direct comparison and max three", async ({
  page,
}) => {
  await page.goto(
    "/products?lang=en&usage=" +
      encodeURIComponent("الطبخ") +
      "&sort=desc&product=ghazal&compare=missing&compare=ghazal&compare=nabateen&compare=kawakeb&compare=balqa",
  );
  // Comparison and quick view each represent explicit URL requests; close the active dialog.
  const dialogs = page.getByRole("dialog");
  await expect(dialogs).not.toHaveCount(0);
  while (await dialogs.count()) await page.keyboard.press("Escape");
  await expect(page.locator(".comparison-bar")).toContainText("3/3");
  await expect(
    page
      .getByText("Some comparison IDs are unavailable or exceed the three-product limit.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.goto("/products?lang=en&brand=unknown-brand");
  await expect(
    page.getByText("Invalid link or filters. Change the selection or clear filters.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.locator(cards)).toHaveCount(6);
});

test("mobile RTL/LTR, dialog keyboard focus and no page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const lang of ["ar", "en"]) {
    await page.goto(`/products?lang=${lang}`);
    await expect(page.locator(cards)).toHaveCount(6);
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const trigger = page
      .locator(cards)
      .first()
      .getByRole("button", { name: /Product details|تفاصيل المنتج/ });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.screenshot({ path: `.tmp/catalog-mobile-${lang}.png`, fullPage: true });
  }
});

test("comparison limit, selected-product withdrawal and independent retry", async ({ page }) => {
  await page.goto("/products?lang=en");
  await expect(page.locator(cards)).toHaveCount(6);
  for (let i = 0; i < 3; i++) await page.locator(cards).nth(i).getByRole("checkbox").check();
  await page.locator(cards).nth(3).getByRole("checkbox").click();
  await expect(page.locator(cards).nth(3).getByRole("checkbox")).not.toBeChecked();
  await expect(page.locator(".comparison-bar")).toContainText("3/3");
  await page.route("**/api/v1/products/ghazal?*", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: '{"statusCode":404,"code":"NOT_FOUND"}',
    }),
  );
  await page.route("**/api/v1/products/nabateen?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"statusCode":503,"code":"SERVICE_UNAVAILABLE"}',
    }),
  );
  await page.goto("/products?lang=en&compare=ghazal&compare=nabateen");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.locator(".comparison-bar").getByText("Product not found or unavailable.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".comparison-bar")).toContainText("ghazal");
  await expect(
    page.locator(".comparison-bar").getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/v1/products/nabateen?*");
  await page.locator(".comparison-bar").getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".comparison-bar")).toContainText("Al-Nabatin");
  await page.getByRole("button", { name: "Compare products", exact: true }).click();
  await expect(page.locator(".comparison-table thead th")).toHaveCount(2);
  await page.keyboard.press("Escape");
});

test("late responses cannot replace a newer query; locale resets page and preserves selection", async ({
  page,
}) => {
  await page.goto("/products?lang=en&page=2");
  await expect(page.locator(cards)).toHaveCount(5);
  await page.locator(cards).first().getByRole("checkbox").check();
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("ar");
  await expect(page.locator(cards)).toHaveCount(6);
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await expect(page.locator(".comparison-bar")).toContainText("1/3");
  await page.getByRole("combobox", { name: "اللغة", exact: true }).selectOption("en");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/products?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("q") === "Al-Ghazal") await gate;
    try {
      await route.continue();
    } catch {
      /* cancellation is expected */
    }
  });
  await page.getByLabel("Search products", { exact: true }).fill("Al-Ghazal");
  await page.getByLabel("Search products", { exact: true }).fill("Nabatin");
  await expect(page.locator(cards).locator("h3")).toHaveText(["Al-Nabatin"]);
  release();
  await expect(page.locator(cards).locator("h3")).toHaveText(["Al-Nabatin"]);
});

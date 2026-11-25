import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import assert from "node:assert/strict";

export async function scanAccessibility(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const findings = result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    targets: v.nodes.map((n) => n.target),
  }));
  if (findings.length) {
    const file = ".tmp/accessibility-findings.json";
    const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
    fs.mkdirSync(".tmp", { recursive: true });
    fs.writeFileSync(file, JSON.stringify([...old, { label, findings }]));
  }
  assert.equal(findings.length, 0, `Accessibility findings: ${label}`);
}
export async function runReleaseUi({ front }) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let navigations = 0,
    scans = 0;
  try {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    for (const width of [360, 768, 1365])
      for (const lang of ["ar", "en"]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of [
          "/",
          "/products",
          "/recipes",
          "/about",
          "/business",
          "/contact",
          "/privacy",
          "/login",
          "/register",
          "/forgot-password",
          "/unknown-release-route",
        ]) {
          await page.goto(front + route + "?lang=" + lang);
          await expect(page.locator("main")).toBeVisible();
          await expect(page.locator("main h1")).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          // Let approved API content resolve; service failures remain visible and fail this sweep.
          await expect(
            page.locator(".content-feedback[role=status],.catalog-feedback[role=status]"),
          ).toHaveCount(0);
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            true,
            `Overflow ${route} ${lang} ${width}`,
          );
          assert.equal(
            await page.locator('meta[name="robots"]').getAttribute("content"),
            "noindex, nofollow",
          );
          const links = await page
            .locator("a[href]")
            .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
          assert.ok(links.every((v) => !/^\s*(javascript|data|vbscript):/i.test(v)));
          navigations++;
          if (
            width === 360 &&
            ["/products", "/contact", "/login", "/register", "/privacy"].includes(route)
          ) {
            await scanAccessibility(page, `${route}-${lang}-${width}`);
            scans++;
          }
        }
        await page.goto(front + "/products?lang=" + lang);
        await expect(page.locator(".catalog-card")).toHaveCount(6);
        // Full-page capture must first intersect lazy images, as a scrolling reader does.
        for (const image of await page.locator(".catalog-card img").all()) {
          await image.scrollIntoViewIfNeeded();
          await expect
            .poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0))
            .toBe(true);
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: `.tmp/release-catalog-${lang}-${width}.png`,
          fullPage: true,
        });
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement?.tagName === "A"), true);
      }
    await context.close();
    return {
      passed: true,
      navigations,
      accessibilityScans: scans,
      widths: [360, 768, 1365],
      languages: ["ar", "en"],
      reducedMotion: true,
    };
  } finally {
    await browser.close();
  }
}

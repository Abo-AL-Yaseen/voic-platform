import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "@playwright/test";

// Only the validated native disposable checker invokes this module.
export async function runInquiryUi({ front, password }) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let page,
    stage = "initial";
  try {
    for (const lang of ["en", "ar"]) {
      const context = await browser.newContext({
        baseURL: front,
        viewport: { width: 390, height: 844 },
      });
      page = await context.newPage();
      page.setDefaultTimeout(12000);
      const ar = lang === "ar",
        t = (en, arabic) => (ar ? arabic : en);
      const login = async (kind) => {
        await page
          .getByLabel(t("Email", "البريد الإلكتروني"), { exact: true })
          .fill(`inquiry-${kind}@example.test`);
        await page.getByLabel(t("Password", "كلمة المرور"), { exact: true }).fill(password);
        await page.getByRole("button", { name: t("Sign in", "تسجيل الدخول"), exact: true }).click();
      };
      stage = "selection and owned draft";
      await page.goto(
        `/login?lang=${lang}&returnTo=${encodeURIComponent("/inquiries/new?products=ghazal,nabateen,kawakeb,ghazal-butter")}`,
      );
      await login(ar ? "company" : "individual");
      await page.waitForURL(/inquiries\/new/);
      await page.locator(".inquiry-product input:checked").first().waitFor();
      assert.equal(await page.locator(".inquiry-product input:checked").count(), 4);
      await page
        .getByRole("button", {
          name: t("Create draft and continue", "إنشاء مسودة والمتابعة"),
          exact: true,
        })
        .click();
      await page.waitForURL(/draft=/);
      const draft = new URL(page.url()).searchParams.get("draft");
      await page.locator(".inquiry-line-list article").first().waitFor();
      const lines = page.locator(".inquiry-line-list article");
      assert.equal(await lines.count(), 4);
      for (let i = 0; i < 4; i++) {
        const row = lines.nth(i),
          options = row.getByLabel(t("Package option", "خيار التعبئة"), { exact: true });
        if (i === 0 && (await options.locator("option").count()) > 1) {
          await options.selectOption("ghazal-1");
          await row.getByLabel(t("Number of packages", "عدد العبوات"), { exact: true }).fill("8");
        } else {
          await options.selectOption("");
          await row
            .getByLabel(t("Packaging requirements", "متطلبات التعبئة"), { exact: true })
            .fill(`Synthetic packaging requirement ${i}`);
        }
      }
      await page.getByRole("button", { name: t("Save draft", "حفظ المسودة"), exact: true }).click();
      await page.getByText(t("Draft saved.", "حُفظت المسودة."), { exact: true }).waitFor();
      await page.reload();
      await page.locator(".inquiry-line-list article").first().waitFor();
      assert.equal(await lines.count(), 4);
      assert.equal(
        await lines
          .nth(1)
          .getByLabel(t("Packaging requirements", "متطلبات التعبئة"), { exact: true })
          .inputValue(),
        "Synthetic packaging requirement 1",
      );
      await page
        .getByRole("button", { name: t("Save and continue", "حفظ ومتابعة"), exact: true })
        .click();
      stage = "contact persistence and review";
      await page
        .getByLabel(t("Full name", "الاسم الكامل"), { exact: true })
        .fill(`Inquiry UI ${lang}`);
      await page
        .getByLabel(t("Destination country and city", "بلد ومدينة الوجهة"), { exact: true })
        .fill(`Nablus ${lang}`);
      await page
        .getByLabel(t("Notes (optional)", "ملاحظات (اختياري)"), { exact: true })
        .fill("Synthetic inquiry UI note");
      await page
        .getByRole("button", { name: t("Save and continue", "حفظ ومتابعة"), exact: true })
        .click();
      await page
        .getByRole("heading", { name: t("Review inquiry", "راجع الاستفسار"), exact: true })
        .waitFor();
      await page.getByText(`Nablus ${lang}`, { exact: false }).waitFor();
      assert.equal(await page.locator("html").getAttribute("dir"), ar ? "rtl" : "ltr");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `.tmp/inquiry-review-${lang}.png`, fullPage: true });
      stage = "confirmed or lost response submission";
      if (!ar)
        await page.route(
          `**/api/v1/account/inquiries/${draft}/submit`,
          async (route) => {
            const response = await route.fetch();
            assert.ok(response.ok());
            await route.abort("failed");
          },
          { times: 1 },
        );
      await page
        .getByRole("button", { name: t("Submit inquiry", "إرسال الاستفسار"), exact: true })
        .click();
      if (!ar)
        await page.getByRole("button", { name: "Check submission result", exact: true }).click();
      await page.waitForURL(/account\/inquiries\//);
      await page
        .getByRole("heading", { name: t("Inquiry details", "تفاصيل الاستفسار"), exact: true })
        .waitFor();
      await page
        .getByText(t("Submitted for review", "مرسل للمراجعة"), { exact: false })
        .first()
        .waitFor();
      assert.equal(await page.locator(".inquiry-detail-line").count(), 4);
      assert.equal(await page.locator(".workspace-section ol li").count(), 1);
      await page.reload();
      await page.locator(".inquiry-detail-line").first().waitFor();
      await page.getByText(`Nablus ${lang}`, { exact: true }).waitFor();
      stage = "account list headings and access denied";
      await page.goto(`/account/inquiries?lang=${lang}`);
      await page.locator(".data-table tbody tr").first().waitFor();
      const boxes = await page.locator(".workspace-page-heading").evaluate((el) => {
        const p = el.querySelectorAll("p"),
          h = el.querySelector("h1");
        return {
          label: p[0].getBoundingClientRect().bottom,
          title: h.getBoundingClientRect().top,
          bottom: h.getBoundingClientRect().bottom,
          subtitle: p[1].getBoundingClientRect().top,
          border: getComputedStyle(el).borderBottomWidth,
        };
      });
      assert.ok(boxes.label <= boxes.title && boxes.bottom <= boxes.subtitle);
      assert.equal(boxes.border, "0px");
      await page.screenshot({ path: `.tmp/inquiry-account-${lang}.png`, fullPage: true });
      // Loading and failed reads must never masquerade as an empty successful list.
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const listPattern = "**/api/v1/account/inquiries?*";
      await page.route(listPattern, async (route) => {
        await gate;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"statusCode":503,"code":"SERVICE_UNAVAILABLE"}',
        });
      });
      await page.reload();
      await page
        .getByText(t("Loading inquiries…", "جارٍ تحميل الاستفسارات…"), { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByText(t("No inquiries match this search.", "لا توجد استفسارات تطابق البحث."), {
            exact: true,
          })
          .count(),
        0,
      );
      release();
      await page
        .locator(".workspace-content")
        .getByRole("button", { name: t("Retry", "إعادة المحاولة"), exact: true })
        .waitFor();
      await page.unroute(listPattern);
      await page
        .locator(".workspace-content")
        .getByRole("button", { name: t("Retry", "إعادة المحاولة"), exact: true })
        .click();
      await page.locator(".data-table tbody tr").first().waitFor();
      await page
        .getByLabel(t("Search reference", "ابحث بالمرجع"), { exact: true })
        .fill("NO-MATCH");
      await page.getByRole("button", { name: t("Search", "بحث"), exact: true }).click();
      await page
        .getByText(t("No inquiries match this search.", "لا توجد استفسارات تطابق البحث."), {
          exact: true,
        })
        .waitFor();
      await page.goto(`/staff?lang=${lang}`);
      await page
        .getByRole("link", { name: t("Return to my account", "العودة إلى حسابي"), exact: true })
        .waitFor();
      const geometry = await page.locator(".access-denied-card").evaluate((el) => ({
        width: el.getBoundingClientRect().width,
        main: getComputedStyle(el.parentElement).minHeight,
        top: el.getBoundingClientRect().top,
      }));
      assert.ok(geometry.width <= 390 && parseInt(geometry.main) >= 500 && geometry.top > 50);
      assert.equal(await page.locator(".workspace-sidebar").count(), 0);
      await page.screenshot({ path: `.tmp/inquiry-denied-${lang}.png`, fullPage: true });
      if (!ar) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.screenshot({ path: ".tmp/inquiry-denied-desktop.png", fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
      }
      await page
        .getByRole("link", { name: t("Return to my account", "العودة إلى حسابي"), exact: true })
        .click();
      await page.waitForURL((url) => url.pathname === "/account");
      stage = "private inquiry cleanup on account switching";
      await page.evaluate(async () => {
        const { queryClient } = await import("/src/services/queryClient.ts");
        const user = queryClient
          .getQueryCache()
          .getAll()
          .find((q) => q.queryKey[0] === "auth" && q.state.data?.user).state.data.user;
        const key = ["inquiries", "customer", user.id, 0, "late-check"];
        window.inquiryOldId = user.id;
        void queryClient
          .fetchQuery({
            queryKey: key,
            meta: { private: true },
            queryFn: ({ signal }) => {
              signal.addEventListener("abort", () => {});
              return new Promise((r) =>
                setTimeout(() => r({ privateNote: "OLD_INQUIRY_SENTINEL" }), 1000),
              );
            },
          })
          .catch(() => {});
      });
      await page.getByRole("button", { name: t("Log out", "تسجيل الخروج"), exact: true }).click();
      await page.waitForURL(/login/);
      await login(ar ? "individual" : "company");
      await page.waitForURL(/\/account/);
      await page.waitForTimeout(1100);
      assert.equal(
        await page.evaluate(async () => {
          const { queryClient } = await import("/src/services/queryClient.ts");
          return queryClient
            .getQueryCache()
            .getAll()
            .some((q) => q.queryKey.includes(window.inquiryOldId));
        }),
        false,
      );
      await context.close();
    }
    return {
      passed: true,
      languages: ["ar", "en"],
      mobileWidth: 390,
      selectedProducts: 4,
      lostResponse: true,
      headingAndDeniedLayout: true,
      accountSwitch: true,
    };
  } catch (error) {
    fs.mkdirSync(".tmp", { recursive: true });
    fs.writeFileSync(
      ".tmp/inquiry-ui-failure.json",
      JSON.stringify({
        stage,
        kind: error.name,
        message: String(error.message)
          .replace(/[a-f0-9]{64}/g, "[redacted]")
          .slice(0, 300),
        body: page
          ? (
              await page
                .locator("body")
                .innerText()
                .catch(() => "")
            )
              .replace(/[a-f0-9]{64}/g, "[redacted]")
              .slice(0, 9000)
          : "",
      }),
    );
    throw new Error(`Inquiry browser stage: ${stage}`);
  } finally {
    await browser.close();
  }
}

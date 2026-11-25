import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
export async function runContentUi({ front, base, password, source, AuthUser, persistedMediaUrl }) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let page,
    stage = "start";
  const mediaEvents = [];
  function phase(value) {
    stage = value;
    fs.writeFileSync(
      ".tmp/content-ui-progress.json",
      JSON.stringify({ stage, checkedAt: new Date().toISOString() }),
    );
  }
  const nav = async (p, url) =>
    p.evaluate((url) => {
      history.pushState(null, "", url);
      dispatchEvent(new PopStateEvent("popstate"));
    }, url);
  try {
    for (const lang of ["en", "ar"]) {
      const ar = lang === "ar",
        t = (en, arabic) => (ar ? arabic : en);
      const context = await browser.newContext({
          baseURL: front,
          viewport: ar ? { width: 390, height: 844 } : { width: 1365, height: 900 },
        }),
        editorContext = await browser.newContext({
          baseURL: front,
          viewport: { width: 390, height: 844 },
        }),
        publicContext = await browser.newContext({ baseURL: front });
      const a = await context.newPage(),
        e = await editorContext.newPage(),
        p = await publicContext.newPage();
      page = a;
      a.on("response", async (r) => {
        if (r.url().includes("/api/v1/staff/content/media/") && r.url().endsWith("/preview"))
          mediaEvents.push({
            path: new URL(r.url()).pathname,
            status: r.status(),
            policy: (await r.allHeaders())["cross-origin-resource-policy"],
          });
      });
      a.on("requestfailed", (r) => {
        if (r.url().includes("/api/v1/staff/content/media/"))
          mediaEvents.push({ path: new URL(r.url()).pathname, failure: r.failure()?.errorText });
      });
      for (const tab of [a, e, p]) tab.setDefaultTimeout(15000);
      const login = async (tab, email) => {
        await tab.goto(`/login?lang=${lang}`);
        await tab.getByLabel(t("Email", "البريد الإلكتروني"), { exact: true }).fill(email);
        await tab.getByLabel(t("Password", "كلمة المرور"), { exact: true }).fill(password);
        await tab.getByRole("button", { name: t("Sign in", "تسجيل الدخول"), exact: true }).click();
        await tab.waitForURL((u) => u.pathname === "/staff");
      };
      phase(`${lang} editor product draft and conflict`);
      await login(a, "workflow-admin@example.test");
      await login(e, "content-editor@example.test");
      await e.goto(`/staff/products/ghazal?lang=${lang}`);
      await e.getByLabel(t("English description", "الوصف بالإنجليزية"), { exact: true }).waitFor();
      const description = e.getByLabel(t("English description", "الوصف بالإنجليزية"), {
        exact: true,
      });
      const oldDescription = await description.inputValue();
      await description.fill(`CMS_UI_PRIVATE_DRAFT_${lang}`);
      assert.equal(
        await e
          .getByRole("button", { name: t("Approve and publish", "اعتماد ونشر"), exact: true })
          .count(),
        0,
      );
      await a.goto(`/staff/products/ghazal?lang=${lang}`);
      await a
        .getByLabel(t("English description", "الوصف بالإنجليزية"), { exact: true })
        .fill(`CMS_UI_OTHER_DRAFT_${lang}`);
      let ack = a.waitForResponse(
        (r) => r.url().endsWith("/staff/content/products/ghazal/actions") && r.ok(),
      );
      await a.getByRole("button", { name: t("Save draft", "حفظ المسودة"), exact: true }).click();
      await ack;
      await e
        .getByRole("button", {
          name: t("Refresh and compare, keeping input", "تحديث ومقارنة مع الاحتفاظ بالمدخلات"),
          exact: true,
        })
        .click();
      await e.getByRole("dialog").waitFor();
      assert.equal(await description.inputValue(), `CMS_UI_PRIVATE_DRAFT_${lang}`);
      await e.keyboard.press("Escape");
      ack = e.waitForResponse(
        (r) => r.url().endsWith("/staff/content/products/ghazal/actions") && r.ok(),
      );
      await e.getByRole("button", { name: t("Save draft", "حفظ المسودة"), exact: true }).click();
      await ack;
      await p.goto("/products/ghazal?lang=en");
      await p.locator("main h1").waitFor();
      assert.ok(!(await p.locator("body").innerText()).includes(`CMS_UI_PRIVATE_DRAFT_${lang}`));
      phase(`${lang} private preview review and admin publication`);
      await e
        .getByRole("button", { name: t("Preview draft", "معاينة المسودة"), exact: true })
        .click();
      await e
        .getByRole("dialog")
        .getByText(`CMS_UI_PRIVATE_DRAFT_${lang}`, { exact: true })
        .waitFor();
      await e.keyboard.press("Escape");
      ack = e.waitForResponse(
        (r) => r.url().endsWith("/staff/content/products/ghazal/actions") && r.ok(),
      );
      await e.getByRole("button", { name: t("Request review", "طلب مراجعة"), exact: true }).click();
      await ack;
      await a
        .getByRole("button", {
          name: t("Refresh and compare, keeping input", "تحديث ومقارنة مع الاحتفاظ بالمدخلات"),
          exact: true,
        })
        .click();
      await a.getByRole("dialog").waitFor();
      await a
        .getByRole("button", {
          name: t(
            "Replace my input with this revision after review",
            "استبدال مدخلاتي بهذه النسخة بعد المراجعة",
          ),
          exact: true,
        })
        .click();
      await a
        .getByRole("button", { name: t("Approve and publish", "اعتماد ونشر"), exact: true })
        .click();
      await a.getByRole("dialog").waitFor();
      assert.ok(await a.evaluate(() => !!document.activeElement.closest('[role="dialog"],dialog')));
      await a.keyboard.press("Escape");
      await a
        .getByRole("button", { name: t("Approve and publish", "اعتماد ونشر"), exact: true })
        .click();
      ack = a.waitForResponse(
        (r) => r.url().endsWith("/staff/content/products/ghazal/actions") && r.ok(),
      );
      await a
        .getByRole("button", { name: t("Confirm action", "تأكيد الإجراء"), exact: true })
        .click();
      await ack;
      await p.reload();
      await p.getByText(`CMS_UI_PRIVATE_DRAFT_${lang}`, { exact: true }).waitFor();
      phase(`${lang} restore editorial test change`);
      await a
        .getByLabel(t("English description", "الوصف بالإنجليزية"), { exact: true })
        .fill(oldDescription);
      ack = a.waitForResponse(
        (r) => r.url().endsWith("/staff/content/products/ghazal/actions") && r.ok(),
      );
      await a.getByRole("button", { name: t("Save draft", "حفظ المسودة"), exact: true }).click();
      await ack;
      ack = a.waitForResponse(
        (r) => r.url().endsWith("/staff/content/products/ghazal/actions") && r.ok(),
      );
      await a.getByRole("button", { name: t("Request review", "طلب مراجعة"), exact: true }).click();
      await ack;
      await a
        .getByRole("button", { name: t("Approve and publish", "اعتماد ونشر"), exact: true })
        .click();
      ack = a.waitForResponse(
        (r) => r.url().endsWith("/staff/content/products/ghazal/actions") && r.ok(),
      );
      await a
        .getByRole("button", { name: t("Confirm action", "تأكيد الإجراء"), exact: true })
        .click();
      await ack;
      phase(`${lang} media upload and library`);
      await a.goto(`/staff/media?lang=${lang}`);
      await a.getByLabel(t("Image file", "ملف الصورة"), { exact: true }).waitFor();
      const persistedId = persistedMediaUrl.split("/").pop().replace(".webp", "");
      const persistedSelector = `.cms-media-grid img[src*="/${persistedId}/preview"]`;
      await a.locator(persistedSelector).scrollIntoViewIfNeeded();
      await a.waitForFunction(
        (selector) => {
          const img = document.querySelector(selector);
          return img?.complete && img.naturalWidth > 0;
        },
        persistedSelector,
        { timeout: 15000 },
      );
      // A real small PNG fixture is supplied by the backend checker; never use a user's mail/files.
      await a
        .getByLabel(t("Image file", "ملف الصورة"), { exact: true })
        .setInputFiles(path.resolve("../backend/.tmp/content-upload.png"));
      await a
        .getByLabel(t("Arabic alt text", "النص البديل بالعربية"), { exact: true })
        .fill(`UI media Arabic ${lang}`);
      await a
        .getByLabel(t("English alt text", "النص البديل بالإنجليزية"), { exact: true })
        .fill(`UI media English ${lang}`);
      const uploadAck = a.waitForResponse(
        (r) => r.url().endsWith("/staff/content/media/upload") && r.ok(),
      );
      await a.getByRole("button", { name: t("Upload image", "رفع الصورة"), exact: true }).click();
      await uploadAck;
      await a.getByText(`UI media ${ar ? "Arabic" : "English"} ${lang}`, { exact: true }).waitFor();
      await a.locator(".cms-media-grid img").first().scrollIntoViewIfNeeded();
      await a.waitForFunction(
        () => {
          const img = document.querySelector(".cms-media-grid img");
          return img?.complete && img.naturalWidth > 0;
        },
        undefined,
        { timeout: 15000 },
      );
      assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await a.screenshot({ path: `.tmp/content-library-${lang}.png`, fullPage: true });
      phase(`${lang} registered image selection and preview`);
      await a.goto(`/staff/products/ghazal?lang=${lang}`);
      await a
        .getByRole("button", {
          name: t("Choose from media library", "اختيار من مكتبة الوسائط"),
          exact: true,
        })
        .click();
      await a
        .getByRole("dialog")
        .getByLabel(t("Search media", "بحث الوسائط"), { exact: true })
        .fill(`UI media English ${lang}`);
      await a
        .getByRole("dialog")
        .locator(".cms-media-grid article")
        .filter({ hasText: `UI media ${ar ? "Arabic" : "English"} ${lang}` })
        .getByRole("button", { name: t("Select image", "اختيار الصورة"), exact: true })
        .click();
      await a
        .getByRole("button", { name: t("Preview draft", "معاينة المسودة"), exact: true })
        .click();
      await a.getByRole("dialog").locator('img[src*="/preview"]').first().waitFor();
      await a.keyboard.press("Escape");
      phase(`${lang} shared contact edit publication and restore`);
      await a.goto(`/staff/content/shared?lang=${lang}`);
      const emailField = a.getByLabel(
        t("Link or contact channel", "رابط أو قناة تواصل") + " — email",
        { exact: true },
      );
      const originalEmail = await emailField.inputValue();
      const saveReviewPublish = async () => {
        for (const button of [t("Save draft", "حفظ المسودة"), t("Request review", "طلب مراجعة")]) {
          const response = a.waitForResponse(
            (r) => r.url().endsWith("/staff/content/pages/shared/actions") && r.ok(),
          );
          await a.getByRole("button", { name: button, exact: true }).click();
          await response;
        }
        await a
          .getByRole("button", { name: t("Approve and publish", "اعتماد ونشر"), exact: true })
          .click();
        const response = a.waitForResponse(
          (r) => r.url().endsWith("/staff/content/pages/shared/actions") && r.ok(),
        );
        await a
          .getByRole("button", { name: t("Confirm action", "تأكيد الإجراء"), exact: true })
          .click();
        await response;
      };
      await emailField.fill("cms-ui@example.test");
      await saveReviewPublish();
      await p.goto(`/contact?lang=${lang}`);
      await p.locator('a[href="mailto:cms-ui@example.test"]').first().waitFor();
      await emailField.fill(originalEmail);
      await saveReviewPublish();
      phase(`${lang} recipes scaling printing and failure recovery`);
      await p.goto(`/recipes/semolina-maamoul?lang=${lang}`);
      await p.locator(".ingredient-list li").first().waitFor();
      const first = await p.locator(".ingredient-list li").first().innerText();
      await p.getByRole("button", { name: t("Double", "ضعف الكمية"), exact: true }).click();
      assert.notEqual(await p.locator(".ingredient-list li").first().innerText(), first);
      await p.locator(".ingredient-list input").first().check();
      assert.ok(await p.locator(".ingredient-list input").first().isChecked());
      await p.evaluate(() => {
        window.print = () => {
          window.printInvoked = true;
        };
      });
      await p.getByRole("button", { name: t("Print recipe", "اطبع الوصفة"), exact: true }).click();
      assert.equal(await p.evaluate(() => window.printInvoked), true);
      await p.goto(`/recipes?lang=${lang}`);
      await p.locator(".recipe-card").first().waitFor();
      assert.equal(await p.locator(".recipe-card").count(), 4);
      await p.getByRole("searchbox").fill("maamoul");
      await p.waitForFunction(() => document.querySelectorAll(".recipe-card").length === 1);
      await p.route("**/api/v1/recipes?*", (r) =>
        r.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"code":"SERVICE_UNAVAILABLE"}',
        }),
      );
      await p.reload();
      await p
        .getByRole("alert")
        .getByText(
          t("Could not load content. Please retry.", "تعذر تحميل المحتوى. أعد المحاولة."),
          { exact: true },
        )
        .waitFor();
      assert.equal(await p.locator(".recipe-card").count(), 0);
      await p.unroute("**/api/v1/recipes?*");
      await p.getByRole("button", { name: t("Retry", "إعادة المحاولة"), exact: true }).click();
      await p.locator(".recipe-card").first().waitFor();
      phase(`${lang} public structured content and staff denial`);
      for (const url of ["/", "/about", "/business", "/contact", "/privacy"]) {
        await p.goto(`${url}?lang=${lang}`);
        await p.locator("main h1").waitFor();
        assert.ok(!(await p.locator("body").innerText()).includes("CMS_UI_PRIVATE_DRAFT_"));
      }
      await a.setViewportSize({ width: 390, height: 844 });
      await a.goto(`/staff/products/ghazal?lang=${lang}`);
      await a.getByLabel(t("English description", "الوصف بالإنجليزية"), { exact: true }).waitFor();
      assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await a.screenshot({ path: `.tmp/content-editor-${lang}.png`, fullPage: true });
      // Revocation clears private editor caches and unsaved state without restoring a late response.
      await a
        .getByLabel(t("English description", "الوصف بالإنجليزية"), { exact: true })
        .fill("PRIVATE_UNSAVED_EDITOR");
      const user = await source
        .getRepository(AuthUser)
        .findOneByOrFail({ email: "workflow-admin@example.test" });
      await source.getRepository(AuthUser).update({ id: user.id }, { role: "sales" });
      await a
        .getByRole("button", {
          name: t("Refresh and compare, keeping input", "تحديث ومقارنة مع الاحتفاظ بالمدخلات"),
          exact: true,
        })
        .click();
      await a
        .getByRole("heading", {
          name: t("You do not have access to this workspace", "لا تملك صلاحية الوصول لهذه المساحة"),
          exact: true,
        })
        .waitFor();
      assert.equal(
        await a.evaluate(async () => {
          const { queryClient } = await import("/src/services/queryClient.ts");
          return queryClient
            .getQueryCache()
            .getAll()
            .some((q) => q.queryKey[0] === "editorial");
        }),
        false,
      );
      assert.ok(!(await a.locator("body").innerText()).includes("PRIVATE_UNSAVED_EDITOR"));
      await source.getRepository(AuthUser).update({ id: user.id }, { role: "administrator" });
      await context.close();
      await editorContext.close();
      await publicContext.close();
    }
    fs.rmSync(".tmp/content-ui-failure.json", { force: true });
    return {
      passed: true,
      languages: ["ar", "en"],
      draftIsolation: true,
      reviewPublish: true,
      conflictPreservesInput: true,
      mediaUpload: true,
      mediaPersistenceAfterRestart: true,
      mediaSelection: true,
      contactEditPublicationAndRestore: true,
      recipeScalingPrint: true,
      publicFailureRecovery: true,
      structuredPages: true,
      mobileOverflow: true,
      permissionCacheCleanup: true,
    };
  } catch (e) {
    await page?.screenshot({ path: ".tmp/content-ui-failure.png", fullPage: true }).catch(() => {});
    fs.writeFileSync(
      ".tmp/content-ui-failure.json",
      JSON.stringify({
        stage,
        mediaEvents,
        kind: e.name,
        message: String(e.message)
          .replace(/[a-f0-9]{64}/g, "[redacted]")
          .slice(0, 500),
        body: page
          ? (
              await page
                .locator("body")
                .innerText()
                .catch(() => "")
            )
              .replace(/[a-f0-9]{64}/g, "[redacted]")
              .slice(0, 12000)
          : "",
      }),
    );
    throw new Error("Content browser failed at " + stage);
  } finally {
    await browser.close();
  }
}

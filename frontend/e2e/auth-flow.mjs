import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

// Called only by the guarded disposable native checker. No external SMTP, no console
// output of URLs/tokens, and no authentication writes to the development database.
export async function runAuthUi({
  front,
  base,
  captured,
  password,
  source,
  AuthSession,
  AuthUser,
}) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const checked = [];
  let debugPage,
    step = "initial";
  try {
    for (const lang of ["en", "ar"]) {
      const context = await browser.newContext({
        baseURL: front,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      debugPage = page;
      page.setDefaultTimeout(12000);
      const ar = lang === "ar",
        t = (en, arabic) => (ar ? arabic : en);
      const email = `ui-${lang}-${randomBytes(5).toString("hex")}@example.test`;
      const returnTo = "/inquiries/new?products=ghazal,nabateen";
      await page.goto(`/products?lang=${lang}`);
      await page.locator(".product-card").first().waitFor();
      const publicCount = await page.evaluate(async () => {
        const { queryClient } = await import("/src/services/queryClient.ts");
        return queryClient
          .getQueryCache()
          .getAll()
          .filter((q) => q.queryKey[0] === "products").length;
      });
      assert.ok(publicCount > 0);
      step = "registration";
      await page.goto(`/register?lang=${lang}&returnTo=${encodeURIComponent(returnTo)}`);
      await page.getByLabel(t("Full name", "الاسم الكامل"), { exact: true }).fill("UI customer");
      if (ar) await page.getByText("شركة", { exact: true }).click();
      if (ar) await page.getByLabel("اسم الشركة", { exact: true }).fill("Test company");
      await page.getByLabel(t("Country", "الدولة"), { exact: true }).fill("Palestine");
      await page.getByLabel(t("Email", "البريد الإلكتروني"), { exact: true }).fill(email);
      await page.getByLabel(t("Password", "كلمة المرور"), { exact: true }).fill(password);
      await page
        .getByLabel(t("Confirm password", "تأكيد كلمة المرور"), { exact: true })
        .fill(password);
      await page
        .getByRole("button", { name: t("Create account", "إنشاء الحساب"), exact: true })
        .click();
      await page.waitForURL(/verify-email/);
      const verification = captured(email, "verify");
      assert.ok(verification.url.includes("products"));
      await page.goto(verification.url);
      await page.reload();
      await page
        .getByRole("button", { name: t("Confirm email", "تأكيد البريد الإلكتروني"), exact: true })
        .click();
      await page
        .getByRole("heading", { name: t("Email verified", "تم التحقق من البريد"), exact: true })
        .waitFor();
      await page.getByRole("link", { name: t("Continue", "متابعة"), exact: true }).click();
      await page.waitForURL(/login/);
      async function login(pass = password) {
        await page.getByLabel(t("Email", "البريد الإلكتروني"), { exact: true }).fill(email);
        await page.getByLabel(t("Password", "كلمة المرور"), { exact: true }).fill(pass);
        await page.getByRole("button", { name: t("Sign in", "تسجيل الدخول"), exact: true }).click();
      }
      await login();
      await page.waitForURL(/inquiries\/new/);
      assert.equal(new URL(page.url()).searchParams.get("products"), "ghazal,nabateen");
      step = "profile";
      await page.goto(`/account/profile?lang=${lang}`);
      const name = page.getByLabel(t("Full name", "الاسم الكامل"), { exact: true });
      await name.fill(`Edited ${lang}`);
      await page
        .getByRole("button", { name: t("Save changes", "حفظ التغييرات"), exact: true })
        .click();
      await page.getByText(t("Changes saved.", "حُفظت التغييرات."), { exact: true }).waitFor();
      await page.reload();
      assert.equal(await name.inputValue(), `Edited ${lang}`);
      assert.equal(await page.locator("html").getAttribute("dir"), ar ? "rtl" : "ltr");
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      );
      // Old private requests must not reappear after logout/account switching.
      await page.evaluate(async () => {
        const { queryClient } = await import("/src/services/queryClient.ts");
        const { getProducts } = await import("/src/services/products.ts");
        await queryClient.fetchQuery({
          queryKey: ["products", "auth-preservation-check"],
          queryFn: ({ signal }) => getProducts({ locale: "en" }, signal),
        });
      });
      const oldId = await page.evaluate(async () => {
        const { queryClient } = await import("/src/services/queryClient.ts");
        const session = queryClient
          .getQueryCache()
          .getAll()
          .find((q) => q.queryKey[0] === "auth" && q.state.data?.user);
        const id = session.state.data.user.id;
        queryClient.setQueryDefaults(["account", id, "late"], { meta: { private: true } });
        void queryClient
          .fetchQuery({
            queryKey: ["account", id, "late"],
            meta: { private: true },
            queryFn: ({ signal }) => {
              signal.addEventListener("abort", () => {});
              return new Promise((r) =>
                setTimeout(() => r({ name: "OLD_PRIVATE_SENTINEL" }), 1200),
              );
            },
          })
          .catch(() => {});
        return id;
      });
      await page.getByRole("button", { name: t("Log out", "تسجيل الخروج"), exact: true }).click();
      await page.waitForURL(/login/);
      await page.waitForTimeout(1500);
      const cache = await page.evaluate(async (id) => {
        const { queryClient } = await import("/src/services/queryClient.ts");
        const all = queryClient.getQueryCache().getAll();
        return {
          old: all.filter((q) => q.meta?.private && q.queryKey.includes(id)).length,
          public: all.filter((q) => q.queryKey[0] === "products").length,
        };
      }, oldId);
      assert.equal(cache.old, 0);
      assert.ok(cache.public > 0);
      // Recovery is delivered through captured development mail and remains reloadable.
      step = "recovery";
      await page.goto(`/forgot-password?lang=${lang}`);
      await page.getByLabel(t("Email", "البريد الإلكتروني"), { exact: true }).fill(email);
      await page
        .getByRole("button", { name: t("Request recovery link", "طلب رابط الاستعادة"), exact: true })
        .click();
      await page
        .getByText(
          t(
            "If the email has an account, recovery instructions will be sent.",
            "إن كان البريد مرتبطًا بحساب فستصلك تعليمات الاستعادة.",
          ),
          { exact: true },
        )
        .waitFor();
      const reset = captured(email, "reset");
      await page.goto(reset.url);
      await page.reload();
      const newPassword = "another long UI password 2026";
      await page
        .getByLabel(t("New password", "كلمة المرور الجديدة"), { exact: true })
        .fill(newPassword);
      await page
        .getByLabel(t("Confirm password", "تأكيد كلمة المرور"), { exact: true })
        .fill(newPassword);
      await page
        .getByRole("button", { name: t("Save password", "حفظ كلمة المرور"), exact: true })
        .click();
      await page
        .getByText(
          t(
            "Password reset. Previous sessions were revoked. Sign in again.",
            "تم تغيير كلمة المرور وإبطال الجلسات السابقة. سجّل الدخول مجددًا.",
          ),
          { exact: true },
        )
        .waitFor();
      await page
        .getByRole("link", { name: t("Sign in", "تسجيل الدخول"), exact: true })
        .last()
        .click();
      await login(newPassword);
      await page.waitForURL((url) => url.pathname.startsWith("/account"));
      step = "security";
      await page.goto(`/account/security?lang=${lang}`);
      await page
        .getByLabel(t("Current password", "كلمة المرور الحالية"), { exact: true })
        .fill("incorrect");
      await page
        .getByLabel(t("New password", "كلمة المرور الجديدة"), { exact: true })
        .fill(password);
      await page
        .getByLabel(t("Confirm password", "تأكيد كلمة المرور"), { exact: true })
        .fill(password);
      await page
        .getByRole("button", { name: t("Update password", "تحديث كلمة المرور"), exact: true })
        .click();
      await page.getByRole("alert").waitFor();
      await page
        .getByLabel(t("Current password", "كلمة المرور الحالية"), { exact: true })
        .fill(newPassword);
      await page
        .getByRole("button", { name: t("Update password", "تحديث كلمة المرور"), exact: true })
        .click();
      await page.waitForURL(/login/);
      await login();
      await page.waitForURL((url) => url.pathname.startsWith("/account"));
      // A customer cannot reach staff, even via a direct URL.
      await page.goto(`/staff?lang=${lang}`);
      await page
        .getByRole("heading", {
          name: t("You do not have access to this workspace", "لا تملك صلاحية الوصول لهذه المساحة"),
          exact: true,
        })
        .waitFor();
      const user = await source.getRepository(AuthUser).findOneByOrFail({ email });
      await source.getRepository(AuthSession).delete({ userId: user.id });
      step = "profile";
      await page.goto(`/account/profile?lang=${lang}`);
      await page
        .getByRole("heading", {
          name: t("Sign in to continue", "سجّل الدخول للمتابعة"),
          exact: true,
        })
        .waitFor();
      // A different unverified account gets the warning, with original product IDs intact.
      const switchEmail = `switch-${lang}-${randomBytes(4).toString("hex")}@example.test`;
      const csrf = await (await context.request.get(base + "/auth/session")).json();
      const headers = { Origin: front, "X-CSRF-Token": csrf.csrfToken };
      await context.request.post(base + "/auth/register", {
        headers,
        data: {
          name: "Second UI account",
          kind: "individual",
          country: "Palestine",
          email: switchEmail,
          password,
          lang,
          returnTo,
        },
      });
      await page.goto(`/login?lang=${lang}&returnTo=${encodeURIComponent(returnTo)}`);
      await page.getByLabel(t("Email", "البريد الإلكتروني"), { exact: true }).fill(switchEmail);
      await page.getByLabel(t("Password", "كلمة المرور"), { exact: true }).fill(password);
      await page.getByRole("button", { name: t("Sign in", "تسجيل الدخول"), exact: true }).click();
      await page.waitForURL(/verify-email/);
      assert.equal(
        new URL(new URL(page.url()).searchParams.get("returnTo"), front).searchParams.get(
          "products",
        ),
        "ghazal,nabateen",
      );
      await page.getByText(t("Not verified yet", "لم يتم التحقق بعد"), { exact: true }).waitFor();
      await page
        .getByRole("button", {
          name: t("Resend verification email", "إعادة إرسال رسالة التحقق"),
          exact: true,
        })
        .click();
      await page
        .getByText(
          t(
            "Request accepted. Check your email if the account is eligible.",
            "تم قبول الطلب. تحقق من بريدك إن كان الحساب مؤهلًا.",
          ),
          { exact: true },
        )
        .waitFor();
      // The server identity, not a role flag or previous profile, controls the new screen.
      step = "profile";
      await page.goto(`/account/profile?lang=${lang}`);
      assert.equal(await name.inputValue(), "Second UI account");
      assert.ok(!(await page.content().then((s) => s.includes("OLD_PRIVATE_SENTINEL"))));
      if (lang === "en") {
        step = "staff role redirect";
        const employee = await source
          .getRepository(AuthUser)
          .findOneByOrFail({ email: switchEmail });
        await source
          .getRepository(AuthUser)
          .update({ id: employee.id }, { role: "content_editor" });
        await page.goto("/login?lang=en");
        await page.getByLabel("Email", { exact: true }).fill(switchEmail);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await page.waitForURL((url) => url.pathname === "/staff");
        await page.getByRole("heading", { name: "Content management", exact: true }).waitFor();
        await page.getByRole("link", { name: "Products", exact: true }).last().waitFor();
        await page.goto("/staff/inquiries?lang=en");
        await page
          .getByRole("heading", { name: "You do not have access to this workspace", exact: true })
          .waitFor();
        await source.getRepository(AuthUser).update({ id: employee.id }, { role: "customer" });
      }
      await context.close();
      checked.push(lang);
    }
    step = "pending failure and token states";
    const failureContext = await browser.newContext({ baseURL: front });
    const page = await failureContext.newPage();
    debugPage = page;
    page.setDefaultTimeout(12000);
    const email = `failure-${randomBytes(5).toString("hex")}@example.test`;
    let session = await (await failureContext.request.get(base + "/auth/session")).json();
    let headers = { Origin: front, "X-CSRF-Token": session.csrfToken };
    const created = await failureContext.request.post(base + "/auth/register", {
      headers,
      data: {
        name: "Failure flow",
        kind: "individual",
        country: "Palestine",
        email,
        password,
        lang: "en",
      },
    });
    assert.equal(created.status(), 201);
    const expired = captured(email, "verify");
    await source.query("UPDATE auth_action_tokens SET expiresAt = ? WHERE tokenHash = ?", [
      new Date(Date.now() - 60000),
      createHash("sha256").update(expired.token).digest("hex"),
    ]);
    await page.goto(expired.url);
    await page.getByRole("button", { name: "Confirm email", exact: true }).click();
    await page.getByText("This link expired. Request a new link.", { exact: true }).waitFor();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Resend verification email", exact: true }).click();
    await page
      .getByText("Request accepted. Check your email if the account is eligible.", { exact: true })
      .waitFor();
    const fresh = captured(email, "verify");
    await page.goto(fresh.url);
    await page.getByRole("button", { name: "Confirm email", exact: true }).click();
    await page.getByRole("heading", { name: "Email verified", exact: true }).waitFor();
    await page.reload();
    await page.getByRole("button", { name: "Confirm email", exact: true }).click();
    await page
      .getByText("This link was already used. Request a new link if needed.", { exact: true })
      .waitFor();
    await page.goto(`/verify-email?lang=en#token=${"0".repeat(64)}`);
    await page.getByRole("button", { name: "Confirm email", exact: true }).click();
    await page.getByText("This link is invalid. Request a new link.", { exact: true }).waitFor();
    await page.goto("/login?lang=en");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.route("**/auth/login", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "SERVICE_UNAVAILABLE" }),
      }),
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("alert")
      .getByText("The service could not be reached. Try again.", { exact: true })
      .waitFor();
    await page.unroute("**/auth/login");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/account");
    await page.route("**/auth/session", async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });
    await page.goto("/account?lang=en");
    await page.getByText("Checking session…", { exact: true }).waitFor();
    await page.getByRole("heading", { name: "Account overview", exact: true }).waitFor();
    await page.unroute("**/auth/session");
    await page.goto("/forgot-password?lang=en");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.route("**/auth/password/forgot", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ code: "TOO_MANY_REQUESTS" }),
      }),
    );
    await page.getByRole("button", { name: "Request recovery link", exact: true }).click();
    await page
      .getByText("Too many requests. Wait 15 minutes and try again.", { exact: true })
      .waitFor();
    await failureContext.close();
    return {
      passed: true,
      locales: checked,
      flows:
        "registration, capture verification/reload, sign-in/redirect/selection, profile/save/reload, logout/private cache cancellation, capture recovery/reset/reload, password change, role restriction/staff redirect, expiry, account switching, mobile RTL/LTR, pending, service failure/recovery, expired/used/invalid tokens, rate-limit feedback",
    };
  } catch (error) {
    const detail = String(error?.message || "UI verification failed")
      .replace(/[a-f0-9]{64}/gi, "[redacted]")
      .replace(/https?:\/\/[^\s"']+/g, "[url]")
      .replace(/[\w.+-]+@[\w.-]+/g, "[address]");
    fs.writeFileSync(
      path.resolve(".tmp/auth-ui-failure.json"),
      JSON.stringify({
        step,
        detail,
        body: await debugPage
          ?.locator("body")
          .innerText()
          .catch(() => ""),
      }),
    );
    throw new Error("UI verification failed");
  } finally {
    await browser.close();
  }
}

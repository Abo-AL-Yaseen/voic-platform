import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "@playwright/test";
import { provisionLocalStaff } from "../../backend/.tmp/auth-build/auth/local-staff.js";
import { loadEnvironment } from "../../backend/.tmp/auth-build/config/environment.js";
import { totp } from "../../backend/scripts/test-staff-mfa.mjs";
import { scanAccessibility } from "./release-quality.mjs";
export async function runSecurityUi({ front, base, password, source, AuthUser, mailDir }) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let stage = "start",
    page;
  const navigate = (p, url) =>
    p.evaluate((url) => {
      history.pushState(null, "", url);
      dispatchEvent(new PopStateEvent("popstate"));
    }, url);
  try {
    for (const lang of ["en", "ar"]) {
      const ar = lang === "ar",
        t = (en, arabic) => (ar ? arabic : en),
        email = `security-ui-${lang}@example.test`;
      const fixture = await provisionLocalStaff(source, loadEnvironment(), {
        mode: "create",
        email,
        password,
        role: "administrator",
        name: "Security UI",
        country: "PS",
        verifyDevelopment: true,
      });
      const context = await browser.newContext({
        baseURL: front,
        viewport: ar ? { width: 390, height: 844 } : { width: 1365, height: 900 },
      });
      page = await context.newPage();
      page.setDefaultTimeout(15000);
      const login = async () => {
        await page.goto(`/login?lang=${lang}`);
        await page.getByLabel(t("Email", "البريد الإلكتروني"), { exact: true }).fill(email);
        await page.getByLabel(t("Password", "كلمة المرور"), { exact: true }).fill(password);
        await page.getByRole("button", { name: t("Sign in", "تسجيل الدخول"), exact: true }).click();
        await page.waitForURL((u) => u.pathname === "/staff/security");
      };
      stage = `${lang} restricted enrollment`;
      await login();
      assert.equal((await context.request.get(base + "/staff/employees")).status(), 403);
      await page
        .getByLabel(t("Current password", "كلمة المرور الحالية"), { exact: true })
        .fill(password);
      const begin = page.waitForResponse(
        (r) => r.url().endsWith("/staff-security/enrollment") && r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: t("Start MFA setup", "بدء إعداد التحقق"), exact: true })
        .click();
      const setup = await (await begin).json();
      assert.equal((await begin).headers()["cache-control"], "no-store");
      await page
        .getByAltText(t("Authenticator setup QR code", "رمز إعداد تطبيق المصادقة"))
        .waitFor();
      assert.ok(
        await page
          .getByAltText(t("Authenticator setup QR code", "رمز إعداد تطبيق المصادقة"))
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      );
      await page
        .getByLabel(t("Authenticator code", "رمز تطبيق المصادقة"), { exact: true })
        .fill(await totp(setup.secret));
      const confirmed = page.waitForResponse((r) => r.url().endsWith("/enrollment/confirm"));
      await page
        .getByRole("button", { name: t("Confirm enrollment", "تأكيد التفعيل"), exact: true })
        .click();
      const once = await (await confirmed).json();
      const codes = once.recoveryCodes;
      assert.equal(codes.length, 10);
      await page
        .getByRole("heading", {
          name: t("Store these codes privately", "احفظ الرموز بشكل خاص"),
          exact: true,
        })
        .waitFor();
      assert.equal(await page.locator(".recovery-codes code").count(), 10);
      assert.ok(
        !(
          await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
        ).includes(codes[0]),
      );
      await page
        .getByRole("button", {
          name: t("I stored the codes securely", "حفظت الرموز بشكل آمن"),
          exact: true,
        })
        .click();
      stage = `${lang} employee invitation and confirmation`;
      await page.goto(`/staff/employees?lang=${lang}`);
      await page
        .getByRole("heading", { name: t("Employee management", "إدارة الموظفين"), exact: true })
        .waitFor();
      await page
        .getByLabel(t("Invitation email", "بريد الدعوة"), { exact: true })
        .fill(`ui-invited-${lang}@example.test`);
      await page
        .getByLabel(t("Action reason (at least 10 characters)", "سبب الإجراء (10 أحرف على الأقل)"), {
          exact: true,
        })
        .fill("Disposable UI invitation verification");
      await page
        .getByRole("button", { name: t("Create invitation", "إنشاء دعوة"), exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      assert.ok(await dialog.evaluate((d) => d.contains(document.activeElement)));
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(
        await page.getByLabel(t("Invitation email", "بريد الدعوة"), { exact: true }).inputValue(),
        `ui-invited-${lang}@example.test`,
      );
      await page
        .getByRole("button", { name: t("Create invitation", "إنشاء دعوة"), exact: true })
        .click();
      await dialog
        .getByRole("button", { name: t("Confirm action", "تأكيد الإجراء"), exact: true })
        .click();
      await page
        .getByText(
          t("Invitation saved in local mail capture only.", "حُفظت الدعوة في البريد المحلي فقط."),
          { exact: true },
        )
        .waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      let invitationUrl;
      for (const name of fs.readdirSync(mailDir)) {
        const m = JSON.parse(fs.readFileSync(`${mailDir}/${name}`, "utf8"));
        if (
          JSON.stringify(m.to).includes(`ui-invited-${lang}@example.test`) &&
          m.text.includes("/staff-invitation")
        )
          invitationUrl = m.text.split("\n").find((x) => x.startsWith(front));
      }
      assert.ok(invitationUrl);
      const guest = await browser.newContext({
          baseURL: front,
          viewport: { width: 390, height: 844 },
        }),
        invited = await guest.newPage();
      await invited.goto(invitationUrl);
      await invited.getByLabel(t("Name", "الاسم"), { exact: true }).fill("Invited UI");
      await invited.getByLabel(t("Country", "الدولة"), { exact: true }).fill("PS");
      await invited.getByLabel(t("Password", "كلمة المرور"), { exact: true }).fill(password);
      assert.equal(new URL(invited.url()).hash, "");
      await invited
        .getByRole("button", { name: t("Accept invitation", "قبول الدعوة"), exact: true })
        .click();
      await invited
        .getByText(
          t(
            "Your account is ready. Sign in and complete MFA.",
            "تم إنشاء حسابك. سجّل الدخول وأكمل التحقق.",
          ),
          { exact: true },
        )
        .waitFor();
      await guest.close();
      stage = `${lang} employee role and status dialogs`;
      await page
        .getByLabel(t("Search name or email", "بحث بالاسم أو البريد"), { exact: true })
        .fill(`ui-invited-${lang}@example.test`);
      await page
        .getByRole("button", { name: new RegExp(`ui-invited-${lang}@example\\.test`) })
        .click();
      await page
        .getByLabel(t("New role", "الدور الجديد"), { exact: true })
        .selectOption("content_editor");
      const changeEmployee = async (label) => {
        await page.getByRole("button", { name: label, exact: true }).click();
        const response = page.waitForResponse(
          (r) => r.url().includes("/staff/employees/") && r.url().endsWith("/actions"),
        );
        await page
          .getByRole("dialog")
          .getByRole("button", { name: t("Confirm action", "تأكيد الإجراء"), exact: true })
          .click();
        assert.equal((await response).status(), 201);
        await page.getByRole("dialog").waitFor({ state: "hidden" });
      };
      await changeEmployee(t("Change role", "تغيير الدور"));
      await changeEmployee(t("Suspend", "إيقاف"));
      await page
        .getByRole("button", { name: t("Reactivate", "إعادة التفعيل"), exact: true })
        .waitFor();
      await changeEmployee(t("Reactivate", "إعادة التفعيل"));
      stage = `${lang} audit and assurance challenge`;
      await page.goto(`/staff/audit-log?lang=${lang}`);
      await page
        .getByRole("heading", { name: t("Audit log", "سجل التدقيق"), exact: true })
        .waitFor();
      await page.getByRole("heading", { name: "employees.invite", exact: true }).first().waitFor();
      await page
        .getByLabel(t("Exact action", "الإجراء المطابق"), { exact: true })
        .fill("security.mfa_enrolled");
      await page
        .getByRole("button", { name: t("Apply filters", "تطبيق المرشحات"), exact: true })
        .click();
      await page
        .getByRole("heading", { name: "security.mfa_enrolled", exact: true })
        .first()
        .waitFor();
      assert.ok(!(await page.content()).includes(setup.secret));
      for (const c of codes) assert.ok(!(await page.content()).includes(c));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `.tmp/security-ui-${lang}.png`, fullPage: true });
      if (process.env.RELEASE_VERIFICATION === "yes")
        await scanAccessibility(page, `audit-${lang}`);
      await page.goto(`/staff/security?lang=${lang}`);
      await page.getByRole("button", { name: t("Log out", "تسجيل الخروج"), exact: true }).click();
      await login();
      await page
        .getByLabel(t("Use a recovery code instead", "استخدام رمز استرداد بدل رمز التطبيق"), {
          exact: true,
        })
        .check();
      await page
        .getByLabel(t("Recovery code", "رمز الاسترداد"), { exact: true })
        .fill(codes.shift());
      await page.getByRole("button", { name: t("Confirm", "تأكيد"), exact: true }).click();
      await page
        .getByText(t("Verification completed.", "اكتمل التحقق بنجاح."), { exact: true })
        .waitFor();
      stage = `${lang} session revocation and private cache cleanup`;
      await page.goto(`/staff/employees?lang=${lang}`);
      await page.getByText(email, { exact: false }).first().waitFor();
      await source.getRepository(AuthUser).increment({ id: fixture.id }, "securityVersion", 1);
      await navigate(page, `/staff/audit-log?lang=${lang}`);
      await page
        .getByRole("heading", {
          name: t("Sign in to continue", "سجّل الدخول للمتابعة"),
          exact: true,
        })
        .waitFor();
      assert.equal(await page.locator(".audit-list li").count(), 0);
      await context.close();
    }
    fs.rmSync(".tmp/security-ui-failure.json", { force: true });
    return {
      passed: true,
      languages: ["en", "ar"],
      enrollment: true,
      challengeRecovery: true,
      invitation: true,
      employeeRoleStatus: true,
      audit: true,
      revocation: true,
      mobileKeyboard: true,
    };
  } catch (e) {
    fs.writeFileSync(
      ".tmp/security-ui-failure.json",
      JSON.stringify({
        stage,
        name: e.name,
        trace: e.stack
          ?.split("\n")
          .filter((l) => /^\s+at /.test(l))
          .slice(0, 5),
      }),
    );
    if (page && /\/staff\/(employees|audit-log)$/.test(new URL(page.url()).pathname))
      await page
        .screenshot({ path: ".tmp/security-ui-failure.png", fullPage: true })
        .catch(() => {});
    throw new Error(`Security browser: ${stage}`);
  } finally {
    await browser.close();
  }
}

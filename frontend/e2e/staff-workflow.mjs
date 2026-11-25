import { completeStaff, completeBrowserMfa } from "../../backend/scripts/test-staff-mfa.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";

export async function runStaffUi({ front, base, password, source, AuthUser }) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let page,
    stage = "initial";
  try {
    for (const lang of ["en", "ar"]) {
      const ar = lang === "ar",
        t = (en, arabic) => (ar ? arabic : en);
      const customerContext = await browser.newContext({
          baseURL: front,
          viewport: { width: 390, height: 844 },
        }),
        staffContext = await browser.newContext({
          baseURL: front,
          viewport: ar ? { width: 390, height: 844 } : { width: 1365, height: 900 },
        });
      const a = await customerContext.newPage(),
        b = await staffContext.newPage();
      page = b;
      a.setDefaultTimeout(15000);
      b.setDefaultTimeout(15000);
      const email = ar ? "workflow-sales@example.test" : "workflow-admin@example.test",
        otherEmail = ar ? "workflow-admin@example.test" : "workflow-sales@example.test";
      const login = async (p, email) => {
        await p.getByLabel(t("Email", "البريد الإلكتروني"), { exact: true }).fill(email);
        await p.getByLabel(t("Password", "كلمة المرور"), { exact: true }).fill(password);
        await p.getByRole("button", { name: t("Sign in", "تسجيل الدخول"), exact: true }).click();
        if (email.includes("workflow-")) await completeBrowserMfa(p, base, email, password, lang);
      };
      const navigate = async (p, url) =>
        p.evaluate((url) => {
          history.pushState(null, "", url);
          dispatchEvent(new PopStateEvent("popstate"));
        }, url);
      stage = `${lang} customer submission`;
      await a.goto(
        `/login?lang=${lang}&returnTo=${encodeURIComponent("/inquiries/new?products=ghazal")}`,
      );
      await login(a, "inquiry-individual@example.test");
      await a.waitForURL(/inquiries\/new/);
      await a.locator(".inquiry-product input:checked").waitFor();
      await a
        .getByRole("button", {
          name: t("Create draft and continue", "إنشاء مسودة والمتابعة"),
          exact: true,
        })
        .click();
      await a.waitForURL(/draft=/);
      await a.getByLabel(t("Package option", "خيار التعبئة"), { exact: true }).selectOption("");
      await a
        .getByLabel(t("Packaging requirements", "متطلبات التعبئة"), { exact: true })
        .fill(`UI supply request ${lang}`);
      await a
        .getByRole("button", { name: t("Save and continue", "حفظ ومتابعة"), exact: true })
        .click();
      await a
        .getByLabel(t("Destination country and city", "بلد ومدينة الوجهة"), { exact: true })
        .fill(`UI workflow ${lang}`);
      await a
        .getByRole("button", { name: t("Save and continue", "حفظ ومتابعة"), exact: true })
        .click();
      await a
        .getByRole("button", { name: t("Submit inquiry", "إرسال الاستفسار"), exact: true })
        .click();
      await a.waitForURL(/account\/inquiries\//);
      const id = new URL(a.url()).pathname.split("/").at(-1);
      await a.locator(".inquiry-detail-line").waitFor();
      const ref = await a.locator(".workspace-page-heading p").last().innerText();
      assert.match(ref, /^VOIC-/);
      stage = `${lang} staff reads and review`;
      await b.goto(`/login?lang=${lang}`);
      await login(b, email);
      await b.waitForURL((url) => url.pathname === "/staff");
      await b
        .getByRole("heading", { name: t("Sales dashboard", "لوحة المبيعات"), exact: true })
        .waitFor();
      await b.goto(`/staff/inquiries?lang=${lang}&q=${ref}`);
      await b.locator(".data-table tbody tr").waitFor();
      assert.equal(await b.locator(".data-table tbody tr").count(), 1);
      await b.getByRole("link", { name: ref, exact: true }).click();
      await b.getByLabel(t("Message to customer", "نص الرسالة للعميل"), { exact: true }).waitFor();
      const message = b.getByLabel(t("Message to customer", "نص الرسالة للعميل"), { exact: true }),
        next = b.getByLabel(t("Next status", "الحالة التالية"), { exact: true });
      const send = async (status, text) => {
        await message.fill(text);
        await next.selectOption(status);
        const ack = b.waitForResponse(
          (r) =>
            r.url().endsWith(`/staff/inquiries/${id}/actions`) &&
            r.request().method() === "POST" &&
            r.ok(),
        );
        await b
          .getByRole("button", { name: t("Send to customer", "إرسال للعميل"), exact: true })
          .click();
        await ack;
        await b.getByText(t("Saved successfully.", "تم الحفظ بنجاح."), { exact: true }).waitFor();
      };
      await send("under_review", `Review started ${lang}`);
      stage = `${lang} stale update retains unsent text`;
      await message.fill(`UNSENT EMPLOYEE ${lang}`);
      const c = await browser.newContext();
      const session = await c.request.get(base + "/auth/session", { headers: { Origin: front } });
      let csrf = (await session.json()).csrfToken;
      const signed = await c.request.post(base + "/auth/login", {
        headers: { Origin: front, "X-CSRF-Token": csrf },
        data: { email: otherEmail, password },
      });
      assert.equal(signed.status(), 201);
      csrf = (await signed.json()).csrfToken;
      await completeStaff(
        async (route, body) => {
          const r =
            body === undefined
              ? await c.request.get(base + route)
              : await c.request.post(base + route, {
                  headers: { Origin: front, "X-CSRF-Token": csrf },
                  data: body,
                });
          assert.equal(r.status(), body === undefined ? 200 : 201);
          const d = await r.json();
          csrf = d.csrfToken || d.session?.csrfToken || csrf;
          return d;
        },
        otherEmail,
        password,
      );
      const current = await (
        await c.request.get(`${base}/staff/inquiries/${id}`, { headers: { Origin: front } })
      ).json();
      const race = await c.request.post(`${base}/staff/inquiries/${id}/actions`, {
        headers: { Origin: front, "X-CSRF-Token": csrf },
        data: {
          key: randomUUID(),
          revision: current.revision,
          type: "note",
          text: `RACE_PRIVATE_${lang}`,
        },
      });
      assert.equal(race.status(), 201);
      const sendButton = b.getByRole("button", {
        name: t("Send to customer", "إرسال للعميل"),
        exact: true,
      });
      if (await sendButton.isEnabled()) {
        const conflict = b.waitForResponse(
          (r) => r.url().endsWith(`/staff/inquiries/${id}/actions`) && r.status() === 409,
        );
        await sendButton.click();
        await conflict;
      }
      assert.equal(await message.inputValue(), `UNSENT EMPLOYEE ${lang}`);
      await b
        .getByRole("button", {
          name: t("Refresh and review, keeping text", "تحديث ومراجعة مع الاحتفاظ بالنص"),
          exact: true,
        })
        .click();
      await b
        .getByText(
          t(
            "Record refreshed. Review state and messages; your unsent text remains on this page.",
            "تم تحديث السجل. راجع الحالة والرسائل؛ بقي نصك غير المرسل محفوظًا في الصفحة.",
          ),
          { exact: true },
        )
        .waitFor();
      assert.equal(await message.inputValue(), `UNSENT EMPLOYEE ${lang}`);
      await c.close();
      stage = `${lang} staff requests customer information`;
      await send("awaiting_customer", `Please confirm delivery contact ${lang}`);
      await a
        .getByText(`Please confirm delivery contact ${lang}`, { exact: true })
        .waitFor({ timeout: 25000 });
      assert.equal(await a.locator(".internal-note").count(), 0);
      assert.ok(!(await a.locator("body").innerText()).includes(`RACE_PRIVATE_${lang}`));
      await a
        .getByRole("button", {
          name: t("Refresh and review, keeping text", "تحديث ومراجعة مع الاحتفاظ بالنص"),
          exact: true,
        })
        .click();
      await a
        .getByLabel(t("Your reply to the company", "ردك للشركة"), { exact: true })
        .fill(`Delivery contact confirmed ${lang}`);
      const replyAck = a.waitForResponse(
        (r) => r.url().endsWith(`/account/inquiries/${id}/replies`) && r.ok(),
      );
      await a.getByRole("button", { name: t("Send reply", "إرسال الرد"), exact: true }).click();
      await replyAck;
      await b
        .getByText(`Delivery contact confirmed ${lang}`, { exact: true })
        .waitFor({ timeout: 25000 });
      await b
        .getByRole("button", {
          name: t("Refresh and review, keeping text", "تحديث ومراجعة مع الاحتفاظ بالنص"),
          exact: true,
        })
        .click();
      stage = `${lang} commercial response private note and closing`;
      await send(
        "responded",
        `Supply conditions will be confirmed separately ${lang}. This is not an accepted order.`,
      );
      await b
        .getByLabel(t("Internal note text", "نص الملاحظة الداخلية"), { exact: true })
        .fill(`STAFF_UI_PRIVATE_${lang}`);
      const noteAck = b.waitForResponse(
        (r) =>
          r.url().endsWith(`/staff/inquiries/${id}/actions`) &&
          r.request().postDataJSON()?.type === "note" &&
          r.ok(),
      );
      await b
        .getByRole("button", { name: t("Save internal note", "حفظ ملاحظة داخلية"), exact: true })
        .click();
      await noteAck;
      await b.getByText(`STAFF_UI_PRIVATE_${lang}`, { exact: true }).waitFor();
      await a
        .getByText(
          `Supply conditions will be confirmed separately ${lang}. This is not an accepted order.`,
          { exact: true },
        )
        .waitFor({ timeout: 25000 });
      assert.ok(!(await a.locator("body").innerText()).includes(`STAFF_UI_PRIVATE_${lang}`));
      assert.equal(
        await a.evaluate(async () => {
          const { queryClient } = await import("/src/services/queryClient.ts");
          return JSON.stringify(
            queryClient
              .getQueryCache()
              .getAll()
              .map((q) => q.state.data),
          ).includes("STAFF_UI_PRIVATE_");
        }),
        false,
      );
      await a
        .getByLabel(t("Your reply to the company", "ردك للشركة"), { exact: true })
        .fill(`UNSENT_ON_CLOSE_${lang}`);
      await message.fill(`Review complete ${lang}; no order accepted.`);
      await next.selectOption("closed");
      await sendButton.click();
      await b.getByRole("dialog").waitFor();
      assert.ok(await b.evaluate(() => !!document.activeElement?.closest("dialog")));
      await b.keyboard.press("Escape");
      assert.equal(await b.getByRole("dialog").count(), 0);
      assert.equal(await message.inputValue(), `Review complete ${lang}; no order accepted.`);
      await sendButton.click();
      const closeAck = b.waitForResponse(
        (r) => r.url().endsWith(`/staff/inquiries/${id}/actions`) && r.ok(),
      );
      await b.getByRole("button", { name: t("Confirm close", "تأكيد الإغلاق"), exact: true }).click();
      await closeAck;
      await a
        .getByText(t("This inquiry is read-only.", "هذا الاستفسار للقراءة فقط."), { exact: true })
        .waitFor({ timeout: 25000 });
      assert.equal(
        await a.getByRole("button", { name: t("Send reply", "إرسال الرد"), exact: true }).count(),
        0,
      );
      assert.equal(
        await a
          .getByRole("button", {
            name: t("Refresh and review, keeping text", "تحديث ومراجعة مع الاحتفاظ بالنص"),
            exact: true,
          })
          .count(),
        0,
      );
      await a
        .locator(".retained-composer")
        .getByText(`UNSENT_ON_CLOSE_${lang}`, { exact: true })
        .waitFor();
      await a
        .getByRole("button", { name: t("Copy unsent text", "نسخ النص غير المرسل"), exact: true })
        .click();
      await a
        .getByText(t("Unsent text copied.", "نُسخ النص غير المرسل."), { exact: true })
        .waitFor();
      assert.equal(await a.locator(".record-pager").count(), 0);
      await a.screenshot({ path: `.tmp/staff-customer-${lang}.png`, fullPage: true });
      await b.screenshot({ path: `.tmp/staff-workspace-${lang}.png`, fullPage: true });
      await b.setViewportSize({ width: 390, height: 844 });
      assert.ok(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await b.screenshot({ path: `.tmp/staff-mobile-${lang}.png`, fullPage: true });
      stage = `${lang} private cache identity transition`;
      await b.evaluate(async () => {
        const { queryClient } = await import("/src/services/queryClient.ts");
        const { getProducts } = await import("/src/services/products.ts");
        await queryClient.fetchQuery({
          queryKey: ["products", "staff-cache-preserved"],
          queryFn: ({ signal }) => getProducts({ locale: "en" }, signal),
        });
      });
      await navigate(b, `/login?lang=${lang}`);
      await login(b, "inquiry-individual@example.test");
      await b.waitForURL((url) => url.pathname === "/account");
      assert.equal(
        await b.evaluate(async () => {
          const { queryClient } = await import("/src/services/queryClient.ts");
          return queryClient
            .getQueryCache()
            .getAll()
            .some((q) => q.queryKey[0] === "staff-inquiries");
        }),
        false,
      );
      assert.ok(
        await b.evaluate(async () => {
          const { queryClient } = await import("/src/services/queryClient.ts");
          return queryClient.getQueryData(["products", "staff-cache-preserved"]) !== undefined;
        }),
      );
      await navigate(b, `/login?lang=${lang}`);
      await login(b, email);
      await b.waitForURL((url) => url.pathname === "/staff");
      await navigate(b, `/staff/inquiries/${id}?lang=${lang}`);
      await b.getByText(`STAFF_UI_PRIVATE_${lang}`, { exact: true }).waitFor();
      stage = `${lang} permission revocation and late response cleanup`;
      const employee = await source.getRepository(AuthUser).findOneByOrFail({ email });
      await b.evaluate(async () => {
        const { queryClient } = await import("/src/services/queryClient.ts");
        const session = queryClient
          .getQueryCache()
          .getAll()
          .find((q) => q.queryKey[0] === "auth" && q.state.data?.user).state.data;
        window.staffOldId = session.user.id;
        void queryClient
          .fetchQuery({
            queryKey: ["staff-inquiries", session.user.id, session.user.role, 0, "late"],
            meta: { private: true },
            queryFn: ({ signal }) => {
              signal.addEventListener("abort", () => {});
              return new Promise((r) => setTimeout(() => r({ text: "LATE_PRIVATE_STAFF" }), 1200));
            },
          })
          .catch(() => {});
      });
      await source.getRepository(AuthUser).update({ id: employee.id }, { role: "content_editor" });
      await b.evaluate(async () => {
        const { queryClient } = await import("/src/services/queryClient.ts");
        await queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "staff-inquiries",
        });
      });
      await b
        .getByRole("heading", {
          name: t("You do not have access to this workspace", "لا تملك صلاحية الوصول لهذه المساحة"),
          exact: true,
        })
        .waitFor();
      await b.waitForTimeout(1300);
      assert.equal(
        await b.evaluate(async () => {
          const { queryClient } = await import("/src/services/queryClient.ts");
          return queryClient
            .getQueryCache()
            .getAll()
            .some((q) => q.queryKey.includes(window.staffOldId));
        }),
        false,
      );
      assert.ok(!(await b.locator("body").innerText()).includes("STAFF_UI_PRIVATE"));
      await source
        .getRepository(AuthUser)
        .update({ id: employee.id }, { role: ar ? "sales" : "administrator" });
      await staffContext.close();
      await customerContext.close();
    }
    fs.rmSync(".tmp/staff-ui-failure.json", { force: true });
    return {
      passed: true,
      languages: ["ar", "en"],
      roles: ["administrator", "sales"],
      customerStaffJourney: true,
      conflictTextPreserved: true,
      privateNotes: true,
      closingDialog: true,
      backgroundRefresh: true,
      closedUnsentCopy: true,
      singlePagePagerHidden: true,
      cacheSwitchAndRevocation: true,
    };
  } catch (e) {
    fs.writeFileSync(
      ".tmp/staff-ui-failure.json",
      JSON.stringify({
        stage,
        kind: e.name,
        message: String(e.message)
          .replace(/[a-f0-9]{64}/g, "[redacted]")
          .slice(0, 400),
        body: page
          ? (
              await page
                .locator("body")
                .innerText()
                .catch(() => "")
            )
              .replace(/[a-f0-9]{64}/g, "[redacted]")
              .slice(0, 14000)
          : "",
      }),
    );
    throw new Error(`Staff browser stage: ${stage}`);
  } finally {
    await browser.close();
  }
}

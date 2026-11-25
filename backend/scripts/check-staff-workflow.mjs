import { completeStaff } from "./test-staff-mfa.mjs";
import { StaffInquiryWorkflow1795525200000 } from "../.tmp/auth-build/database/migrations/1795525200000-StaffInquiryWorkflow.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { loadEnvironment } from "../.tmp/auth-build/config/environment.js";
import { AuthUser } from "../.tmp/auth-build/auth/auth.entities.js";
import { provisionLocalStaff } from "../.tmp/auth-build/auth/local-staff.js";
import {
  InquiryAction,
  InquiryMessage,
  InquiryInternalNote,
  InquiryAudit,
} from "../.tmp/auth-build/inquiries/workflow.entities.js";
import {
  CustomerInquiry,
  InquiryHistory,
  InquiryNotification,
} from "../.tmp/auth-build/inquiries/inquiry.entities.js";
import { WORKFLOW_CONFIG } from "../.tmp/auth-build/inquiries/workflow.config.js";
import { InquiryNotifications } from "../.tmp/auth-build/inquiries/notifications.service.js";
import { MailService } from "../.tmp/auth-build/auth/mail.service.js";
import { CatalogTranslation } from "../.tmp/auth-build/catalog/catalog.entities.js";
export async function checkStaffWorkflow({ app, source, base, front, password }) {
  const env = loadEnvironment();
  assert.equal(env.nodeEnv, "test");
  assert.match(env.dbDatabase, /^voic_test_[a-f0-9]{16}$/);
  assert.equal(process.env.CONFIRM_DISPOSABLE_DATABASE, "yes");
  let stage = "local provisioning";
  try {
    const client = () => ({
      cookie: "",
      csrf: "",
      async call(
        route,
        body,
        expected = body === undefined ? 200 : 201,
        method = body === undefined ? "GET" : "POST",
        extra = {},
      ) {
        const res = await fetch(base + route, {
          method,
          headers: {
            Origin: front,
            Cookie: this.cookie,
            "Content-Type": "application/json",
            "X-CSRF-Token": this.csrf,
            ...extra,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const cookie = res.headers.getSetCookie().find((c) => c.startsWith("voic_session="));
        if (cookie) this.cookie = cookie.split(";")[0];
        if (Array.isArray(expected)) assert.ok(expected.includes(res.status));
        else assert.equal(res.status, expected);
        const result = await res.json();
        if (result.session?.csrfToken) this.csrf = result.session.csrfToken;
        if (result.csrfToken) this.csrf = result.csrfToken;
        return result;
      },
      async login(email) {
        await this.call("/auth/session");
        let r = await this.call("/auth/login", { email, password });
        if (r.user.role !== "customer" && r.user.emailVerified)
          r = await completeStaff((...args) => this.call(...args), email, password);
        this.user = r.user;
        return r;
      },
    });
    const admin = client(),
      sales = client(),
      customer = client(),
      other = client(),
      editor = client(),
      anon = client();
    for (const [role, email] of [
      ["administrator", "workflow-admin@example.test"],
      ["sales", "workflow-sales@example.test"],
    ])
      await provisionLocalStaff(source, env, {
        mode: "create",
        email,
        role,
        name: `Workflow ${role}`,
        country: "PS",
        password,
        verifyDevelopment: true,
      });
    await assert.rejects(
      provisionLocalStaff(
        source,
        { ...env, nodeEnv: "production" },
        {
          mode: "create",
          email: "forbidden@example.test",
          role: "sales",
          name: "Forbidden",
          country: "PS",
          password,
          verifyDevelopment: true,
        },
      ),
    );
    await assert.rejects(
      provisionLocalStaff(source, env, {
        mode: "create",
        email: "workflow-sales@example.test",
        role: "sales",
        name: "Collision",
        country: "PS",
        password,
        verifyDevelopment: true,
      }),
    );
    await admin.login("workflow-admin@example.test");
    await sales.login("workflow-sales@example.test");
    await customer.login("inquiry-individual@example.test");
    await other.login("inquiry-company@example.test");
    await anon.call("/auth/session");
    const editorAccount = await provisionLocalStaff(source, env, {
      mode: "create",
      email: "workflow-editor@example.test",
      role: "sales",
      name: "Editor",
      country: "PS",
      password,
      verifyDevelopment: true,
    });
    await source
      .getRepository(AuthUser)
      .update({ id: editorAccount.id }, { role: "content_editor" });
    await editor.login("workflow-editor@example.test");
    const path = "/staff/inquiries";
    stage = "roles drafts and read boundaries";
    const d = await customer.call("/account/inquiries", { creationKey: randomUUID(), lang: "en" });
    for (const [cl, code] of [
      [anon, 401],
      [customer, 403],
      [editor, 403],
    ]) {
      await cl.call(path, undefined, code);
      await cl.call(path + "/stats", undefined, code);
      await cl.call(`${path}/${d.id}`, undefined, code);
      await cl.call(
        `${path}/${d.id}/actions`,
        { key: randomUUID(), revision: d.revision, type: "note", text: "forbidden" },
        code,
      );
    }
    await admin.call(`${path}/${d.id}`, undefined, 404);
    assert.equal((await sales.call(`${path}?q=${d.reference}`)).total, 0);
    const saved = await customer.call(
      `/account/inquiries/${d.id}`,
      {
        revision: d.revision,
        lang: "en",
        fields: {
          ...d.fields,
          destination: "Workflow destination",
          notes: "Customer original requirement",
        },
        items: [
          {
            productId: "ghazal",
            packageId: null,
            quantity: 25,
            unit: "kg",
            requirements: "Discuss packaging",
          },
        ],
      },
      200,
      "PATCH",
    );
    const submissionKey = randomUUID(),
      submitted = await customer.call(`/account/inquiries/${d.id}/submit`, {
        key: submissionKey,
        revision: saved.revision,
      });
    const url = `${path}/${d.id}`,
      own = `/account/inquiries/${d.id}`;
    let i = await sales.call(url);
    assert.deepEqual(i.items, submitted.items);
    assert.equal(i.permissions.writesEnabled, true);
    assert.equal(i.status, "submitted");
    assert.equal(
      (
        await sales.call(
          `${path}?q=${submitted.reference}&destination=Workflow%20destination&status=submitted`,
        )
      ).total,
      1,
    );
    assert.equal((await sales.call(`${path}?q=%25`)).total, 0);
    await sales.call(`${path}?pageSize=51`, undefined, 400);
    await sales.call(`${path}?status=draft`, undefined, 400);
    await sales.call(`${path}?userId=x`, undefined, 400);
    await other.call(own, undefined, 404);
    await other.call(
      own + "/replies",
      { key: randomUUID(), revision: i.revision, text: "other" },
      404,
    );
    await sales.call(own, undefined, 403);
    stage = "concurrent status changes and idempotency";
    const bodies = [admin, sales].map(() => ({
      key: randomUUID(),
      revision: i.revision,
      type: "status",
      status: "under_review",
      text: "",
    }));
    const race = await Promise.all([
      admin.call(url + "/actions", bodies[0], [201, 409]),
      sales.call(url + "/actions", bodies[1], [201, 409]),
    ]);
    assert.equal(race.filter((r) => r.actionId).length, 1);
    const winner = race[0].actionId ? 0 : 1,
      cl = [admin, sales][winner];
    const repeated = await cl.call(url + "/actions", bodies[winner]);
    assert.equal(repeated.actionId, race[winner].actionId);
    assert.equal(
      (await cl.call(`${url}/actions/${bodies[winner].key}`)).actionId,
      repeated.actionId,
    );
    await cl.call(url + "/actions", { ...bodies[winner], text: "incompatible" }, 409);
    i = await sales.call(url);
    assert.equal(i.status, "under_review");
    assert.equal(
      (await customer.call(own + "/submit", { key: submissionKey, revision: saved.revision }))
        .status,
      "under_review",
    );
    await admin.call(
      url + "/actions",
      {
        key: randomUUID(),
        revision: i.revision,
        type: "message",
        text: "inject",
        actorId: admin.user.id,
      },
      400,
    );
    await admin.call(
      url + "/actions",
      {
        key: randomUUID(),
        revision: i.revision,
        type: "status",
        status: "awaiting_customer",
        text: "   ",
      },
      400,
    );
    await admin.call(
      url + "/actions",
      { key: randomUUID(), revision: i.revision, type: "status", status: "submitted", text: "bad" },
      400,
    );
    await admin.call(
      url + "/actions",
      { key: randomUUID(), revision: i.revision, type: "note", text: "stale" },
      403,
      "POST",
      { "X-CSRF-Token": "" },
    );
    await admin.call(
      url + "/actions",
      { key: randomUUID(), revision: i.revision, type: "note", text: "x".repeat(4001) },
      400,
    );
    const ask = {
      key: randomUUID(),
      revision: i.revision,
      type: "status",
      status: "awaiting_customer",
      text: "Please confirm the destination contact.",
    };
    i = (await sales.call(url + "/actions", ask)).record;
    assert.equal(i.status, "awaiting_customer");
    const beforeNote = await source.getRepository(InquiryNotification).countBy({ inquiryId: d.id });
    const note = {
      key: randomUUID(),
      revision: i.revision,
      type: "note",
      text: "PRIVATE_NOTE_SENTINEL",
    };
    i = (await admin.call(url + "/actions", note)).record;
    assert.equal(i.internalNotes[0].text, note.text);
    assert.equal(
      await source.getRepository(InquiryNotification).countBy({ inquiryId: d.id }),
      beforeNote,
    );
    const publicRead = await customer.call(own);
    assert.ok(
      !/PRIVATE_NOTE_SENTINEL|internalNotes|actorId|actorRole|audit|fingerprint/.test(
        JSON.stringify(publicRead),
      ),
    );
    assert.equal(publicRead.messages[0].sender, "staff");
    await admin.call(
      url + "/actions",
      { key: randomUUID(), revision: note.revision, type: "message", text: "preserve unsent" },
      409,
    );
    stage = "customer reply history audit and notification atomicity";
    const reply = {
      key: randomUUID(),
      revision: i.revision,
      text: "The destination contact is available. <script>plain text</script>",
    };
    await customer.call(own + "/replies", { ...reply, role: "sales" }, 400);
    const replies = await Promise.all([
      customer.call(own + "/replies", reply),
      customer.call(own + "/replies", reply),
    ]);
    assert.equal(replies[0].actionId, replies[1].actionId);
    i = await sales.call(url);
    assert.equal(i.status, "under_review");
    assert.equal(
      (await customer.call(`${own}/actions/${reply.key}`)).actionId,
      replies[0].actionId,
    );
    await other.call(`${own}/actions/${reply.key}`, undefined, 404);
    assert.equal(await source.getRepository(InquiryMessage).countBy({ inquiryId: d.id }), 2);
    assert.equal(await source.getRepository(InquiryInternalNote).countBy({ inquiryId: d.id }), 1);
    assert.equal(await source.getRepository(InquiryAction).countBy({ inquiryId: d.id }), 4);
    assert.equal(await source.getRepository(InquiryAudit).countBy({ inquiryId: d.id }), 4);
    assert.equal(await source.getRepository(InquiryHistory).countBy({ inquiryId: d.id }), 4);
    const audits = await source.getRepository(InquiryAudit).findBy({ inquiryId: d.id });
    assert.ok(
      audits.every(
        (a) => a.actorId && a.actorRole && !JSON.stringify(a.metadata).includes("SENTINEL"),
      ),
    );
    const worker = app.get(InquiryNotifications);
    clearInterval(worker.timer);
    const mail = app.get(MailService),
      deliver = mail.deliver.bind(mail);
    mail.deliver = async () => {
      throw new Error("Synthetic mail failure");
    };
    await worker.tick();
    assert.equal(await source.getRepository(InquiryAction).countBy({ inquiryId: d.id }), 4);
    const failed = await source.getRepository(InquiryNotification).findBy({ inquiryId: d.id });
    assert.ok(failed.some((n) => n.attempts === 1 && n.state === "pending"));
    mail.deliver = deliver;
    await source
      .getRepository(InquiryNotification)
      .update({ inquiryId: d.id, state: "pending" }, { nextAttemptAt: new Date(0) });
    for (let n = 0; n < 6; n++) await worker.tick();
    assert.equal(
      await source
        .getRepository(InquiryNotification)
        .countBy({ inquiryId: d.id, state: "captured" }),
      5,
    );
    const mailDir = `.tmp/${process.env.MAIL_CAPTURE_NAME}`;
    for (const name of fs.readdirSync(mailDir)) {
      const message = JSON.parse(fs.readFileSync(`${mailDir}/${name}`, "utf8"));
      assert.ok(!String(message.text).includes("PRIVATE_NOTE_SENTINEL"));
      if (String(message.subject).includes(submitted.reference))
        assert.ok(!String(message.text).includes(reply.text));
    }
    stage = "responses closing immutable snapshots and production gate";
    const response = {
      key: randomUUID(),
      revision: i.revision,
      type: "status",
      status: "responded",
      text: "Commercial response for review; no order accepted.",
    };
    i = (await sales.call(url + "/actions", response)).record;
    const close = {
      key: randomUUID(),
      revision: i.revision,
      type: "status",
      status: "closed",
      text: "Review complete. No order accepted or fulfilled.",
    };
    i = (await admin.call(url + "/actions", close)).record;
    assert.equal(i.status, "closed");
    for (const [type, text, status] of [
      ["message", "no", undefined],
      ["note", "no", undefined],
      ["status", "reopen", "under_review"],
    ])
      await admin.call(
        url + "/actions",
        { key: randomUUID(), revision: i.revision, type, text, status },
        409,
      );
    await customer.call(
      own + "/replies",
      { key: randomUUID(), revision: i.revision, text: "closed" },
      409,
    );
    const translation = await source
      .getRepository(CatalogTranslation)
      .findOneByOrFail({ productId: "ghazal", locale: "en" });
    const original = structuredClone(translation.fields);
    translation.fields.name.value = "Catalog changed later";
    await source.getRepository(CatalogTranslation).save(translation);
    assert.deepEqual((await customer.call(own)).items, submitted.items);
    assert.deepEqual((await customer.call(own)).fields, submitted.fields);
    await source
      .getRepository(CatalogTranslation)
      .update({ productId: "ghazal", locale: "en" }, { fields: original });
    const conf = app.get(WORKFLOW_CONFIG);
    conf.writesEnabled = false;
    await admin.call(
      url + "/actions",
      { key: randomUUID(), revision: i.revision, type: "note", text: "disabled" },
      403,
    );
    assert.equal((await admin.call(url)).permissions.writesEnabled, false);
    conf.writesEnabled = true;
    const rollbackProbe = source.createQueryRunner();
    try {
      await assert.rejects(new StaffInquiryWorkflow1795525200000().down(rollbackProbe));
    } finally {
      await rollbackProbe.release();
    }
    assert.equal(Number((await source.query("SELECT COUNT(*) n FROM voic_migrations"))[0].n), 7);
    const ordered = await source
      .getRepository(CustomerInquiry)
      .createQueryBuilder("i")
      .where("i.status <> 'draft' AND i.submittedAt IS NOT NULL")
      .getMany();
    for (const row of ordered)
      await source
        .getRepository(CustomerInquiry)
        .update({ id: row.id }, { submittedAt: new Date("2026-01-01T00:00:00Z") });
    const listing = await admin.call(path + "?sort=asc&pageSize=50");
    assert.deepEqual(
      listing.items.map((r) => r.id),
      ordered.map((r) => r.id).sort(),
    );
    const pagination = await Promise.all(
      [1, 2, 3].map((page) => admin.call(`${path}?sort=asc&pageSize=1&page=${page}`)),
    );
    assert.deepEqual(
      pagination.flatMap((r) => r.items.map((i) => i.id)),
      listing.items.slice(0, 3).map((i) => i.id),
    );
    assert.equal((await admin.call(path + "/stats")).total, ordered.length);
    stage = "explicit promotion preserves profile password and invalidates sessions";
    const promote = client();
    await promote.call("/auth/session");
    await promote.call("/auth/register", {
      email: "promote-local@example.test",
      password,
      name: "Preserved customer",
      kind: "company",
      company: "Preserved company",
      country: "PS",
    });
    await promote.login("promote-local@example.test");
    const before = await source
      .getRepository(AuthUser)
      .createQueryBuilder("u")
      .addSelect("u.passwordHash")
      .where("u.id=:id", { id: promote.user.id })
      .getOneOrFail();
    const promoted = await provisionLocalStaff(source, env, {
      mode: "promote",
      email: before.email,
      role: "sales",
      expectedId: before.id,
      expectedRole: "customer",
      verifyDevelopment: false,
    });
    const after = await source
      .getRepository(AuthUser)
      .createQueryBuilder("u")
      .addSelect("u.passwordHash")
      .where("u.id=:id", { id: before.id })
      .getOneOrFail();
    assert.equal(after.passwordHash, before.passwordHash);
    assert.equal(after.company, before.company);
    assert.equal(after.name, before.name);
    assert.equal(after.emailVerifiedAt, null);
    await promote.call("/account/profile", undefined, 401);
    await promote.login(before.email);
    await promote.call(
      url + "/actions",
      { key: randomUUID(), revision: i.revision, type: "note", text: "unverified" },
      403,
    );
    await promote.call("/auth/verification/confirm", { token: promoted.verificationToken });
    await completeStaff((...args) => promote.call(...args), before.email, password);
    assert.ok(
      (await source.getRepository(AuthUser).findOneByOrFail({ id: before.id })).emailVerifiedAt,
    );
    await assert.rejects(
      provisionLocalStaff(source, env, {
        mode: "promote",
        email: before.email,
        role: "administrator",
        expectedId: before.id,
        expectedRole: "customer",
        verifyDevelopment: false,
      }),
    );
    stage = "permission revocation and action rate bounds";
    await source.getRepository(AuthUser).update({ id: sales.user.id }, { role: "content_editor" });
    await sales.call(path, undefined, 403);
    await sales.call(url, undefined, 403);
    await source.getRepository(AuthUser).update({ id: sales.user.id }, { role: "sales" });
    let limited = false;
    for (let n = 0; n < 65; n++) {
      const r = await admin.call(
        url + "/actions",
        { key: randomUUID(), revision: i.revision, type: "note", text: "closed rate check" },
        [409, 429],
      );
      if (r.statusCode === 429) {
        limited = true;
        break;
      }
    }
    assert.ok(limited);
    fs.rmSync(".tmp/staff-api-failure.json", { force: true });
    return {
      passed: true,
      roles: true,
      draftPrivacy: true,
      transitions: true,
      idempotency: true,
      concurrency: true,
      privateNotes: true,
      auditOutboxAtomicity: true,
      notificationRetry: true,
      provisioning: true,
      productionWritesDisabled: true,
    };
  } catch (e) {
    fs.writeFileSync(
      ".tmp/staff-api-failure.json",
      JSON.stringify({
        stage,
        kind: e.name,
        ...(typeof e.actual === "number" ? { actual: e.actual } : {}),
        ...(typeof e.expected === "number" ? { expected: e.expected } : {}),
      }),
    );
    throw e;
  }
}

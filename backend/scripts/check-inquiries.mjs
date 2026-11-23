import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  CustomerInquiry,
  InquiryLine,
  InquiryHistory,
  InquiryNotification,
} from "../.tmp/auth-build/inquiries/inquiry.entities.js";
import {
  CatalogProduct,
  CatalogPackage,
  CatalogTranslation,
} from "../.tmp/auth-build/catalog/catalog.entities.js";
import { InquiryNotifications } from "../.tmp/auth-build/inquiries/notifications.service.js";
import { MailService } from "../.tmp/auth-build/auth/mail.service.js";
import { AuthUser } from "../.tmp/auth-build/auth/auth.entities.js";

// Invoked exclusively inside check-auth's validated disposable target, never standalone.
export async function checkInquiries({ app, source, base, front, password, captured }) {
  assert.match(source.options.database, /^voic_test_[a-f0-9]{16}$/);
  assert.equal(process.env.CONFIRM_DISPOSABLE_DATABASE, "yes");
  const worker = app.get(InquiryNotifications);
  clearInterval(worker.timer);
  const client = () => ({
    cookie: "",
    csrf: "",
    async call(route, body, expected = body === undefined ? 200 : 201, extra = {}, method) {
      const res = await fetch(`${base}/account/inquiries${route}`, {
        method: method || (body === undefined ? "GET" : "POST"),
        headers: {
          Origin: front,
          Cookie: this.cookie,
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrf,
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (Array.isArray(expected)) assert.ok(expected.includes(res.status));
      else assert.equal(res.status, expected);
      return res.json();
    },
    async auth(route, body) {
      const res = await fetch(`${base}/auth/${route}`, {
        method: body ? "POST" : "GET",
        headers: {
          Origin: front,
          Cookie: this.cookie,
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrf,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(res.status, body ? 201 : 200);
      const cookie = res.headers.getSetCookie().find((c) => c.startsWith("voic_session="));
      if (cookie) this.cookie = cookie.split(";")[0];
      const result = await res.json();
      if (result.csrfToken) this.csrf = result.csrfToken;
      return result;
    },
  });
  const a = client(),
    b = client();
  for (const [cl, kind] of [
    [a, "individual"],
    [b, "company"],
  ]) {
    await cl.auth("session");
    const email = `inquiry-${kind}@example.test`;
    await cl.auth("register", {
      name: `Inquiry ${kind}`,
      kind,
      company: kind === "company" ? "Example company" : undefined,
      country: "Palestine",
      email,
      password,
      lang: "en",
    });
    const session = await cl.auth("login", { email, password });
    cl.id = session.user.id;
    cl.email = email;
  }
  await client().call("", undefined, 401);
  const creationKey = randomUUID();
  let d = await a.call("", { creationKey, lang: "en" });
  assert.equal((await a.call("", { creationKey, lang: "en" })).id, d.id);
  await a.call("", { creationKey: randomUUID(), lang: "en", userId: b.id }, 400);
  await a.call(`/${d.id}`, undefined, 200);
  await b.call(`/${d.id}`, undefined, 404);
  await b.call(`/${d.id}/submit`, { key: randomUUID(), revision: 1 }, 403); // unverified before ownership disclosure
  const packages = await source.getRepository(CatalogPackage).find({ where: { published: true } });
  const pack = packages.find((p) => p.productId === "ghazal" && p.amount && p.unit);
  assert.ok(pack);
  const other = packages.find((p) => p.productId !== pack.productId && p.amount);
  const fields = { ...d.fields, destination: "Nablus", notes: "Synthetic customer note" };
  const line = {
    productId: pack.productId,
    packageId: pack.id,
    quantity: 12,
    unit: "packages",
    requirements: "",
  };
  const save = (changes = {}, expected = 200, cl = a, id = d.id) =>
    cl.call(
      `/${id}`,
      { revision: d.revision, lang: "en", fields, items: [line], ...changes },
      expected,
      {},
      "PATCH",
    );
  await save({}, 404, b);
  await save({ ownerId: b.id }, 400);
  await save({ status: "submitted" }, 400);
  await save({ fields: undefined }, 400);
  await save({ items: [{ ...line, quantity: 0 }] }, 400);
  await save({ items: [{ ...line, quantity: 1.5 }] }, 400);
  await save({ items: [{ ...line, packageId: other.id }] }, 400);
  await save({ items: [{ ...line, productId: "missing" }] }, 400);
  await save({ items: [{ ...line, unit: "pallet" }] }, 400);
  await a.call(
    `/${d.id}`,
    { revision: d.revision, lang: "en", fields, items: [line] },
    403,
    { "X-CSRF-Token": "" },
    "PATCH",
  );
  d = await save();
  assert.equal(d.items[0].quantity, 12);
  assert.equal((await a.call(`/${d.id}`)).fields.notes, fields.notes);
  await a.call(`/${d.id}/submit`, { key: randomUUID(), revision: d.revision }, 403);
  for (const cl of [a, b])
    await cl.auth("verification/confirm", { token: captured(cl.email, "verify").token });
  await b.call(`/${d.id}/submit`, { key: randomUUID(), revision: d.revision }, 404);
  const initialRevision = d.revision;
  const concurrentEdits = await Promise.all([save({}, [200, 409]), save({}, [200, 409])]);
  assert.equal(concurrentEdits.filter((x) => x.id).length, 1);
  d = concurrentEdits.find((x) => x.id);
  assert.equal(d.revision, initialRevision + 1);
  const products = source.getRepository(CatalogProduct),
    packs = source.getRepository(CatalogPackage);
  await products.update({ id: line.productId }, { published: false });
  const submitKey = randomUUID();
  await a.call(`/${d.id}/submit`, { key: submitKey, revision: d.revision }, 400);
  await products.update({ id: line.productId }, { published: true });
  await packs.update({ id: line.packageId }, { published: false });
  await a.call(`/${d.id}/submit`, { key: submitKey, revision: d.revision }, 400);
  await packs.update({ id: line.packageId }, { published: true });
  const submissions = await Promise.all([
    a.call(`/${d.id}/submit`, { key: submitKey, revision: d.revision }),
    a.call(`/${d.id}/submit`, { key: submitKey, revision: d.revision }),
  ]);
  assert.deepEqual(submissions[0], submissions[1]);
  const submitted = submissions[0];
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.history.length, 1);
  assert.equal(
    await source.getRepository(CustomerInquiry).countBy({ userId: a.id, status: "submitted" }),
    1,
  );
  assert.equal(await source.getRepository(InquiryHistory).countBy({ inquiryId: d.id }), 1);
  assert.equal(await source.getRepository(InquiryNotification).countBy({ inquiryId: d.id }), 2);
  assert.deepEqual((await a.call(`/${d.id}`)).items, submitted.items); // lost-response resolution by owned GET
  await a.call(`/${d.id}/submit`, { key: submitKey, revision: d.revision + 1 }, 409);
  await a.call(`/${d.id}/submit`, { key: randomUUID(), revision: d.revision }, 409);
  await save({}, 409);
  const tr = source.getRepository(CatalogTranslation),
    translation = await tr.findOneByOrFail({ productId: line.productId, locale: "en" });
  const original = structuredClone(translation.fields);
  translation.fields.name.value = "Edited after submission";
  await tr.save(translation);
  await packs.update({ id: line.packageId }, { sizeEn: "Edited size" });
  assert.deepEqual((await a.call(`/${d.id}`)).items, submitted.items);
  await tr.update({ productId: line.productId, locale: "en" }, { fields: original });
  await packs.update({ id: line.packageId }, { sizeEn: pack.sizeEn });
  assert.ok(
    !/userId|creationKey|submissionKey|recipient|passwordHash|securityVersion|privateNotes/.test(
      JSON.stringify(submitted),
    ),
  );
  const mail = app.get(MailService),
    originalDeliver = mail.deliver.bind(mail);
  mail.deliver = async () => {
    throw new Error("synthetic delivery failure");
  };
  await worker.tick();
  let jobs = await source.getRepository(InquiryNotification).findBy({ inquiryId: d.id });
  assert.ok(jobs.every((n) => n.state === "pending" && n.attempts === 1));
  assert.equal((await a.call(`/${d.id}`)).status, "submitted");
  mail.deliver = originalDeliver;
  await source
    .getRepository(InquiryNotification)
    .update({ inquiryId: d.id }, { nextAttemptAt: new Date(0) });
  await Promise.all([worker.tick(), worker.tick()]);
  jobs = await source.getRepository(InquiryNotification).findBy({ inquiryId: d.id });
  assert.ok(jobs.every((n) => n.state === "captured" && n.attempts === 2));
  await worker.tick();
  assert.equal(await source.getRepository(InquiryNotification).countBy({ inquiryId: d.id }), 2);
  const bd = await b.call("", { creationKey: randomUUID(), lang: "ar" });
  const discussion = {
    productId: "nabateen",
    packageId: null,
    quantity: null,
    unit: null,
    requirements: "Discuss size and packaging with sales",
  };
  const bsave = await b.call(
    `/${bd.id}`,
    {
      revision: bd.revision,
      lang: "ar",
      fields: { ...bd.fields, destination: "Nablus" },
      items: [discussion],
    },
    200,
    {},
    "PATCH",
  );
  assert.equal(bsave.fields.kind, "company");
  await b.call(`/${bd.id}/submit`, { key: randomUUID(), revision: bsave.revision });
  const c = await a.call("/counts");
  assert.deepEqual(c, { draft: 0, submitted: 1, total: 1 });
  assert.equal((await b.call("/counts")).total, 1);
  assert.equal(
    (await a.call(`?q=${submitted.reference}&status=submitted&page=1&pageSize=1&sort=asc`)).total,
    1,
  );
  assert.equal((await a.call("?status=draft")).items.length, 0);
  await a.call("?pageSize=51", undefined, 400);
  await a.call("?userId=another", undefined, 400);
  await source.getRepository(AuthUser).update({ id: a.id }, { role: "sales" });
  await a.call("", undefined, 403);
  await a.call(`/${d.id}`, undefined, 403);
  await source.getRepository(AuthUser).update({ id: a.id }, { role: "customer" });
  // Cross-draft key reuse, deterministic tied dates, pagination and edit/submit races.
  const extra = await a.call("", { creationKey: randomUUID(), lang: "en" });
  await a.call(`/${extra.id}/submit`, { key: submitKey, revision: extra.revision }, 409);
  const extraSaved = await a.call(
    `/${extra.id}`,
    { revision: extra.revision, lang: "en", fields, items: [line] },
    200,
    {},
    "PATCH",
  );
  const race = await Promise.all([
    a.call(
      `/${extra.id}`,
      {
        revision: extraSaved.revision,
        lang: "en",
        fields: { ...fields, notes: "Concurrent edit" },
        items: [line],
      },
      [200, 409],
      {},
      "PATCH",
    ),
    a.call(`/${extra.id}/submit`, { key: randomUUID(), revision: extraSaved.revision }, [201, 409]),
  ]);
  assert.equal(race.filter((x) => x.id).length, 1);
  const third = await a.call("", { creationKey: randomUUID(), lang: "en" });
  const tied = new Date("2026-01-01T00:00:00Z");
  for (const id of [d.id, extra.id, third.id])
    await source.getRepository(CustomerInquiry).update({ id }, { createdAt: tied });
  const all = await a.call("?sort=asc&pageSize=50");
  assert.deepEqual(
    all.items.map((i) => i.id),
    [d.id, extra.id, third.id].sort(),
  );
  const pages = await Promise.all(
    [1, 2, 3].map((page) => a.call(`?sort=asc&pageSize=1&page=${page}`)),
  );
  assert.deepEqual(
    pages.flatMap((p) => p.items.map((i) => i.id)),
    all.items.map((i) => i.id),
  );
  assert.equal((await a.call("?page=100")).items.length, 0);
  assert.equal((await a.call("/counts")).total, 3);
  await a.call("/counts?userId=other", undefined, 400);
  await a.call(`/${d.id}?userId=other`, undefined, 400);
  // Exhausted attempts are bounded; a new worker can recover durable remaining intents.
  await source
    .getRepository(InquiryNotification)
    .update({ inquiryId: bd.id }, { attempts: 5, nextAttemptAt: new Date(0) });
  await worker.tick();
  await worker.tick();
  assert.equal(
    await source.getRepository(InquiryNotification).countBy({ inquiryId: bd.id, state: "failed" }),
    2,
  );
  assert.equal(await source.getRepository(InquiryLine).countBy({ inquiryId: d.id }), 1);
  return {
    passed: true,
    knownPackage: true,
    discussionCompany: true,
    concurrency: true,
    ownership: true,
    notifications: true,
  };
}

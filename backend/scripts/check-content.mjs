import { completeStaff } from "./test-staff-mfa.mjs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import sharp from "sharp";
import { provisionLocalStaff } from "../.tmp/auth-build/auth/local-staff.js";
import { loadEnvironment } from "../.tmp/auth-build/config/environment.js";
import {
  ContentDocument,
  ContentRevision,
  EditorialEvent,
  ContentMedia,
  ContentMediaUsage,
} from "../.tmp/auth-build/content/content.entities.js";
import { importDevelopmentContent } from "../.tmp/auth-build/content/import.js";
import { ContentService } from "../.tmp/auth-build/content/content.service.js";
import { CatalogService } from "../.tmp/auth-build/catalog/catalog.service.js";
import { ContentWorkspace1795532400000 } from "../.tmp/auth-build/database/migrations/1795532400000-ContentWorkspace.js";
export async function checkContent({ app, source, base, front, password }) {
  let stage = "editor identities and role guards";
  let http;
  const client = () => ({
    cookie: "",
    csrf: "",
    async call(url, body, expected = body === undefined ? 200 : 201, extra = {}) {
      const response = await fetch(base + url, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Origin: front,
          ...(this.cookie ? { Cookie: this.cookie } : {}),
          ...(body === undefined
            ? {}
            : { "Content-Type": "application/json", "X-CSRF-Token": this.csrf }),
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const raw = response.headers.get("set-cookie");
      if (raw) this.cookie = raw.split(";")[0];
      const result = response.headers.get("content-type")?.includes("json")
        ? await response.json()
        : await response.arrayBuffer();
      http = { url: url.split("?")[0], status: response.status, expected };
      assert.ok(
        (Array.isArray(expected) ? expected : [expected]).includes(response.status),
        `Content HTTP mismatch during ${stage}: ${response.status}`,
      );
      if (result.session?.csrfToken) this.csrf = result.session.csrfToken;
      if (result.session?.csrfToken) this.csrf = result.session.csrfToken;
      if (result.csrfToken) this.csrf = result.csrfToken;
      return result;
    },
    async login(email) {
      await this.call("/auth/session");
      await this.call("/auth/login", { email, password });
      await completeStaff((...args) => this.call(...args), email, password);
    },
  });
  try {
    const env = loadEnvironment();
    assert.equal(env.nodeEnv, "test");
    assert.match(env.dbDatabase, /^voic_test_[a-f0-9]{16}$/);
    assert.equal(process.env.CONFIRM_DISPOSABLE_DATABASE, "yes");
    await provisionLocalStaff(source, env, {
      mode: "create",
      email: "content-editor@example.test",
      role: "content_editor",
      name: "Disposable content editor",
      country: "PS",
      password,
      verifyDevelopment: true,
    });
    const admin = client(),
      editor = client(),
      sales = client(),
      customer = client(),
      anon = client();
    await admin.login("workflow-admin@example.test");
    await editor.login("content-editor@example.test");
    await sales.login("workflow-sales@example.test");
    await customer.login("inquiry-individual@example.test");
    for (const endpoint of [
      "/staff/content/products",
      "/staff/content/pages",
      "/staff/content/media",
      "/staff/content/metadata",
      "/staff/content/products/ghazal",
    ]) {
      await anon.call(endpoint, undefined, 401);
      await sales.call(endpoint, undefined, 403);
      await customer.call(endpoint, undefined, 403);
      await editor.call(endpoint);
    }
    await editor.call("/staff/content/products?pageSize=51", undefined, 400);
    await editor.call("/staff/content/products?unknown=1", undefined, 400);
    const catalogBefore = await anon.call("/products?sort=reference&pageSize=50");
    assert.equal(catalogBefore.total, 11);
    assert.deepEqual(
      (await anon.call("/products/featured")).items.map((p) => p.id),
      ["ghazal-butter", "nabateen", "kawakeb", "ghazal"],
    );
    const ghazal = await anon.call("/products/ghazal?lang=en");
    assert.deepEqual(
      ghazal.packageOptions.map((p) => p.id),
      ["ghazal-1", "ghazal-2"],
    );
    const unknown = await anon.call("/products/sun-gold-sunflower-oil?lang=en");
    assert.equal(unknown.image, undefined);
    const recipes = await anon.call("/recipes?lang=en&pageSize=50");
    assert.equal(recipes.total, 4);
    assert.ok(
      recipes.items.every(
        (r) => Array.isArray(r.productIds) && r.stepsAr.length && r.stepsEn.length,
      ),
    );
    assert.ok(recipes.items.some((r) => r.ingredients.some((i) => i.amount === undefined)));
    assert.equal((await anon.call("/recipes?lang=en&q=maamoul")).items[0].slug, "semolina-maamoul");
    assert.ok((await anon.call("/recipes?category=main-dishes")).items.length > 0);
    const get = (who, kind, id) => who.call(`/staff/content/${kind}/${id}`);
    const action = async (who, record, name, body, extras = {}, expected = 201) =>
      who.call(
        `/staff/content/${record.kind}/${record.id}/actions`,
        {
          key: randomUUID(),
          version: record.version,
          action: name,
          ...(body ? { body } : {}),
          ...extras,
        },
        expected,
      );
    const publish = async (record) => {
      let r = await action(editor, record, "review");
      return action(admin, r, "publish");
    };
    stage = "draft isolation review approval and idempotence";
    let r = await get(editor, "products", "ghazal");
    const original = structuredClone(r.draft.body),
      draft = {
        ...original,
        descriptionEn: "Synthetic editorial change kept private until approval",
      };
    const key = randomUUID(),
      request = { key, version: r.version, action: "save", body: draft };
    const eventsBefore = await source.getRepository(EditorialEvent).count();
    r = await editor.call("/staff/content/products/ghazal/actions", request);
    assert.equal((await anon.call("/products/ghazal?lang=en")).descriptionEn, ghazal.descriptionEn);
    assert.equal(
      (await editor.call("/staff/content/products/ghazal/actions", request)).version,
      r.version,
    );
    assert.equal(await source.getRepository(EditorialEvent).count(), eventsBefore + 1);
    await editor.call(
      "/staff/content/products/ghazal/actions",
      { ...request, body: original },
      409,
    );
    await action(editor, r, "publish", undefined, {}, 403);
    await action(admin, r, "publish", undefined, {}, 409);
    await editor.call(
      "/staff/content/products/ghazal/actions",
      {
        key: randomUUID(),
        version: r.version,
        action: "save",
        body: { ...draft, slug: "changed-url" },
      },
      400,
    );
    await editor.call(
      "/staff/content/products/ghazal/actions",
      { key: randomUUID(), version: r.version, action: "save", body: draft, actorId: randomUUID() },
      400,
    );
    await editor.call(
      "/staff/content/products/ghazal/actions",
      { key: randomUUID(), version: r.version, action: "save", body: draft },
      403,
      { "X-CSRF-Token": "0".repeat(64) },
    );
    let missing = await action(editor, r, "save", { ...draft, nameEn: "" });
    await action(editor, missing, "review", undefined, {}, 400);
    r = await action(editor, missing, "save", draft);
    r = await publish(r);
    assert.equal((await anon.call("/products/ghazal?lang=en")).descriptionEn, draft.descriptionEn);
    assert.equal(r.approvalScope, "development");
    assert.ok(r.approvedBy);
    assert.equal(r.publishedId, r.draftId);
    // Production projection accepts only an explicitly approved revision, never imported baselines.
    const catalog = app.get(CatalogService),
      mode = catalog.env;
    catalog.env = { ...mode, nodeEnv: "production" };
    try {
      assert.equal((await anon.call("/products?pageSize=50")).total, 0);
    } finally {
      catalog.env = mode;
    }
    r = await action(editor, r, "review");
    r = await action(admin, r, "publish", undefined, {
      approveForProduction: true,
      confirmation: "APPROVE BOTH LOCALES",
    });
    assert.equal(r.approvalScope, "approved");
    catalog.env = { ...mode, nodeEnv: "production" };
    try {
      assert.equal((await anon.call("/products?pageSize=50")).total, 1);
    } finally {
      catalog.env = mode;
    }
    stage = "concurrent revisions stable packaging and relationships";
    const raceBody = { ...r.draft.body, descriptionEn: "Concurrent synthetic draft" };
    const race = await Promise.all([
      editor.call(
        "/staff/content/products/ghazal/actions",
        { key: randomUUID(), version: r.version, action: "save", body: raceBody },
        [201, 409],
      ),
      admin.call(
        "/staff/content/products/ghazal/actions",
        { key: randomUUID(), version: r.version, action: "save", body: raceBody },
        [201, 409],
      ),
    ]);
    assert.equal(race.filter((x) => x.code === "CONTENT_CONFLICT").length, 1);
    r = await get(editor, "products", "ghazal");
    await action(editor, r, "save", { ...r.draft.body, packages: [] }, {}, 409);
    let category = await get(editor, "categories", original.categoryKey);
    await action(admin, category, "archive", undefined, {}, 409);
    const create = async (kind, body) =>
      editor.call(`/staff/content/${kind}/${body.id}/actions`, {
        key: randomUUID(),
        version: 0,
        action: "create",
        body,
      });
    category = await create("categories", {
      id: "synthetic-category",
      slug: "synthetic-category",
      ar: "Synthetic category Arabic",
      en: "Synthetic category",
    });
    category = await publish(category);
    let usage = await create("uses", {
      id: "synthetic-use",
      slug: "synthetic-use",
      ar: "Synthetic use Arabic",
      en: "Synthetic use",
    });
    usage = await publish(usage);
    const newProduct = {
      ...original,
      id: "synthetic-product",
      slug: "synthetic-product",
      featuredOrder: null,
      referenceOrder: 100,
      categoryKey: category.id,
      useKeys: [usage.id],
      displayUseKeys: [usage.id],
      packages: [
        { ...original.packages[0], id: "synthetic-product-known" },
        { ...original.packages[1], id: "synthetic-product-unknown", amount: null, unit: null },
      ],
    };
    let product = await create("products", newProduct);
    await editor.call(
      "/staff/content/products/synthetic-product/actions",
      { key: randomUUID(), version: 0, action: "create", body: newProduct },
      409,
    );
    product = await publish(product);
    assert.equal((await anon.call("/products/synthetic-product?lang=en")).packageOptions.length, 1);
    await action(admin, category, "archive", undefined, {}, 409);
    product = await action(admin, product, "unpublish");
    await anon.call("/products/synthetic-product", undefined, 404);
    product = await action(admin, product, "archive");
    stage = "recipe page and contact publication";
    let recipe = await get(editor, "recipes", "semolina-maamoul");
    const recipeOriginal = structuredClone(recipe.draft.body);
    recipe = await action(editor, recipe, "save", {
      ...recipeOriginal,
      titleEn: "Synthetic recipe revision",
    });
    assert.notEqual(
      (await anon.call("/recipes/semolina-maamoul?lang=en")).titleEn,
      "Synthetic recipe revision",
    );
    recipe = await publish(recipe);
    assert.equal(
      (await anon.call("/recipes/semolina-maamoul?lang=en")).titleEn,
      "Synthetic recipe revision",
    );
    recipe = await action(editor, recipe, "save", recipeOriginal);
    await publish(recipe);
    let shared = await get(editor, "pages", "shared");
    const sharedOriginal = structuredClone(shared.draft.body);
    shared = await action(editor, shared, "save", {
      ...sharedOriginal,
      links: { ...sharedOriginal.links, email: "edited@example.test" },
    });
    assert.equal(
      (await anon.call("/content/shared?lang=en")).links.email,
      sharedOriginal.links.email,
    );
    shared = await publish(shared);
    assert.equal((await anon.call("/content/shared?lang=en")).links.email, "edited@example.test");
    shared = await action(editor, shared, "save", sharedOriginal);
    await publish(shared);
    const contentService = app.get(ContentService),
      contentEnvironment = contentService.env;
    contentService.env = { ...contentEnvironment, nodeEnv: "production" };
    try {
      assert.equal((await anon.call("/recipes?pageSize=50")).total, 0);
      await anon.call("/content/shared", undefined, 404);
    } finally {
      contentService.env = contentEnvironment;
    }
    const privacy = await action(editor, await get(editor, "pages", "privacy"), "review");
    await action(
      admin,
      privacy,
      "publish",
      undefined,
      {
        approveForProduction: true,
        confirmation: "APPROVE BOTH LOCALES",
      },
      400,
    );
    const collision = {
      id: "concurrent-category",
      slug: "concurrent-category",
      ar: "Synthetic Arabic",
      en: "Synthetic English",
    };
    const creations = await Promise.all(
      [admin, editor].map((who) =>
        who.call(
          "/staff/content/categories/concurrent-category/actions",
          { key: randomUUID(), version: 0, action: "create", body: collision },
          [201, 409],
        ),
      ),
    );
    assert.equal(creations.filter((result) => result.code === "CONTENT_UNIQUE").length, 1);
    let home = await get(editor, "pages", "home");
    assert.deepEqual(home.draft.body.featuredProductIds, [
      "ghazal-butter",
      "nabateen",
      "kawakeb",
      "ghazal",
    ]);
    const beforeImport = JSON.stringify((await get(editor, "products", "ghazal")).draft.body);
    const repeat = await importDevelopmentContent(source);
    assert.equal(repeat.inserted, 0);
    assert.equal(
      JSON.stringify((await get(editor, "products", "ghazal")).draft.body),
      beforeImport,
    );
    // Exercise the content retention guard directly, independently of newer migrations.
    const rollbackProbe = source.createQueryRunner();
    try {
      await assert.rejects(new ContentWorkspace1795532400000().down(rollbackProbe));
    } finally {
      await rollbackProbe.release();
    }
    stage = "real image upload safety private preview and references";
    const data = (
      await sharp({ create: { width: 80, height: 60, channels: 4, background: "#78845d" } })
        .png()
        .toBuffer()
    ).toString("base64");
    const upload = {
      key: randomUUID(),
      filename: "synthetic.png",
      data,
      altAr: "Synthetic Arabic image",
      altEn: "Synthetic English image",
    };
    await sales.call("/staff/content/media/upload", upload, 403);
    await customer.call("/staff/content/media/upload", upload, 403);
    const media = await editor.call("/staff/content/media/upload", upload);
    assert.equal((await editor.call("/staff/content/media/upload", upload)).id, media.id);
    await anon.call(media.url.replace("/api/v1", ""), undefined, 404);
    await anon.call(`/staff/content/media/${media.id}/preview`, undefined, 401);
    assert.ok((await editor.call(`/staff/content/media/${media.id}/preview`)).byteLength > 0);
    for (const invalid of [
      { filename: "../../x.png" },
      { filename: "x.svg" },
      { data: Buffer.from('<svg onload="x"/>').toString("base64") },
      { data: Buffer.from("invalid").toString("base64") },
      { altEn: "" },
    ])
      await editor.call(
        "/staff/content/media/upload",
        { ...upload, ...invalid, key: randomUUID() },
        400,
      );
    r = await get(editor, "products", "ghazal");
    r = await action(editor, r, "save", { ...original, image: media.url });
    await editor.call(
      `/staff/content/media/${media.id}/actions`,
      { key: randomUUID(), version: media.version, action: "delete" },
      409,
    );
    r = await publish(r);
    assert.ok((await anon.call(media.url.replace("/api/v1", ""))).byteLength > 0);
    const meta = await sharp(
      Buffer.from(await anon.call(media.url.replace("/api/v1", ""))),
    ).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.exif, undefined);
    const unused = await editor.call("/staff/content/media/upload", {
      ...upload,
      key: randomUUID(),
    });
    await editor.call(`/staff/content/media/${unused.id}/actions`, {
      key: randomUUID(),
      version: unused.version,
      action: "delete",
    });
    assert.equal(await source.getRepository(ContentMedia).countBy({ id: unused.id }), 0);
    assert.ok((await editor.call(`/staff/content/media/${media.id}/usage`)).total > 0);
    const originalMedia = await source
      .getRepository(ContentMedia)
      .findOneByOrFail({ source: "original" });
    await editor.call(
      `/staff/content/media/${originalMedia.id}/actions`,
      { key: randomUUID(), version: originalMedia.version, action: "delete" },
      409,
    );
    r = await action(editor, r, "save", original);
    await publish(r);
    await editor.call(
      `/staff/content/media/${media.id}/actions`,
      { key: randomUUID(), version: media.version, action: "delete" },
      409,
    );
    const allEvents = await source.getRepository(EditorialEvent).find();
    assert.ok(
      allEvents.every(
        (e) => !("body" in e) && !("password" in e) && e.actorId && e.target && e.action,
      ),
    );
    fs.rmSync(".tmp/content-api-failure.json", { force: true });
    return {
      passed: true,
      permissions: true,
      publicationIsolation: true,
      reviewApproval: true,
      productionGates: true,
      concurrency: true,
      relationships: true,
      knownUnknownPackages: true,
      recipes: 4,
      pages: true,
      mediaUpload: true,
      mediaPersistenceUrl: media.url,
      retainedMedia: true,
      importPreservesEdits: true,
    };
  } catch (e) {
    fs.writeFileSync(
      ".tmp/content-api-failure.json",
      JSON.stringify({
        stage,
        kind: e.name,
        http,
        frame: e.stack
          ?.split("\n")
          .find((line) => line.includes("check-content.mjs:"))
          ?.trim(),
        ...(typeof e.actual === "number" ? { actual: e.actual } : {}),
        ...(typeof e.expected === "number" ? { expected: e.expected } : {}),
      }),
    );
    throw e;
  }
}

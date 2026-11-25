import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DataSource, In } from "typeorm";
import { NestFactory } from "@nestjs/core";
import { loadEnvironment } from "../dist/config/environment.js";
import { databaseOptions } from "../dist/database/options.js";
import { AppModule } from "../dist/app.module.js";
import { configureHttp } from "../dist/http/configure-http.js";
import { DATABASE_SOURCE } from "../dist/database/database.service.js";
import { seedCatalog, baseline } from "../dist/catalog/seed.js";
import {
  CatalogProduct,
  CatalogTranslation,
  CatalogPackage,
  CatalogTerm,
} from "../dist/catalog/catalog.entities.js";
import { CatalogService } from "../dist/catalog/catalog.service.js";
import { DatabaseService } from "../dist/database/database.service.js";
import { parseCatalogQuery } from "../dist/catalog/catalog.query.js";

let source,
  app,
  stage = "target validation";
try {
  const env = loadEnvironment();
  assert.equal(env.nodeEnv, "test");
  assert.match(env.dbDatabase, /^voic_test_[a-f0-9]{16}$/);
  assert.equal(process.env.CONFIRM_DISPOSABLE_DATABASE, "yes");
  source = new DataSource(databaseOptions(env));
  await source.initialize();
  const [before] = await source.query(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE()",
  );
  assert.equal(Number(before.n), 0, "Disposable database must start empty");
  stage = "migration and repeatable import";
  assert.equal((await source.runMigrations()).length, 7);
  assert.equal((await source.runMigrations()).length, 0);
  assert.deepEqual(await seedCatalog(source), { inserted: 11, skipped: 0 });
  assert.deepEqual(await seedCatalog(source), { inserted: 0, skipped: 11 });
  const snapshot = async () =>
    Promise.all([
      source.getRepository(CatalogProduct).find({ order: { id: "ASC" } }),
      source.getRepository(CatalogTranslation).find({ order: { productId: "ASC", locale: "ASC" } }),
      source.getRepository(CatalogPackage).find({ order: { id: "ASC" } }),
      source.getRepository(CatalogTerm).find({ order: { kind: "ASC", id: "ASC" } }),
    ]);
  const originalSnapshot = await snapshot();
  const trRepo = source.getRepository(CatalogTranslation);
  const original = await trRepo.findOneByOrFail({ productId: "ghazal", locale: "ar" });
  const edited = structuredClone(original.fields);
  edited.description.value = "Editorial change retained";
  await trRepo.update({ productId: "ghazal", locale: "ar" }, { fields: edited });
  await seedCatalog(source);
  assert.equal(
    (await trRepo.findOneByOrFail({ productId: "ghazal", locale: "ar" })).fields.description.value,
    "Editorial change retained",
  );
  await trRepo.update({ productId: "ghazal", locale: "ar" }, { fields: original.fields });
  const tables = await source.query(
    "SELECT ENGINE AS engine FROM information_schema.tables WHERE table_schema=DATABASE()",
  );
  assert.ok(tables.every((t) => t.engine === "InnoDB"));
  await assert.rejects(source.query("SELECT User FROM mysql.user"));
  stage = "real HTTP catalog contracts";
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  configureHttp(app, env);
  await app.listen(0, "127.0.0.1");
  const base = `${await app.getUrl()}/api/v1/products`;
  const get = async (path = "", status = 200) => {
    const response = await fetch(base + path);
    assert.equal(response.status, status, `HTTP status at ${path}`);
    return response.json();
  };
  const initial = await get("?pageSize=50&sort=reference");
  assert.equal(initial.total, 11);
  assert.deepEqual(
    initial.items.map((p) => p.id),
    baseline().map((p) => p.id),
  );
  for (const p of baseline()) {
    for (const lang of ["ar", "en"]) {
      const detail = await get(`/${p.slug}?lang=${lang}`);
      assert.equal(detail.id, p.id);
      assert.equal(detail.translationAvailable, true);
      assert.equal(detail.name, p.name);
      assert.equal(detail.englishName, p.englishName);
      assert.deepEqual(detail.sizes, p.sizes);
      assert.equal(detail.image, p.image);
      assert.equal(detail.ingredientsAr, undefined);
    }
  }
  assert.deepEqual(
    (await get("/featured")).items.map((p) => p.id),
    ["ghazal-butter", "nabateen", "kawakeb", "ghazal"],
  );
  const paged = [];
  for (let page = 1; page <= 3; page++)
    paged.push(...(await get(`?pageSize=4&page=${page}`)).items);
  assert.equal(new Set(paged.map((p) => p.id)).size, 11);
  const asc = paged.map((p) => p.name);
  assert.deepEqual(
    asc,
    [...asc].sort((a, b) => a.localeCompare(b, "ar")),
  );
  assert.deepEqual(
    (await get("?pageSize=50&sort=desc")).items.map((p) => p.id),
    [...paged].reverse().map((p) => p.id),
  );
  assert.equal((await get("?lang=fr")).items[0].name, paged[0].name);
  assert.equal((await get("?q=" + encodeURIComponent(" اَلْغَــزَال "))).total, 3);
  assert.equal((await get("?q=Butter%20Flavor")).total, 1);
  assert.equal((await get("?q=%27%20OR%201%3D1%20--")).total, 0);
  const combined = await get(
    "?category=vegetable-ghee&usage=cooking&size=15-kg&brand=al-kawakib&brand=al-mumtaz",
  );
  assert.deepEqual(new Set(combined.items.map((p) => p.id)), new Set(["kawakeb", "mumtaz"]));
  assert.equal(
    (await get("?usage=" + encodeURIComponent("الطبخ"))).total,
    (await get("?usage=cooking")).total,
  );
  const lookup = await get("/lookup?ids=reem-sunflower-oil&ids=missing&ids=ghazal&ids=ghazal");
  assert.deepEqual(
    lookup.items.map((p) => p.id),
    ["reem-sunflower-oil", "ghazal"],
  );
  assert.deepEqual(lookup.unavailableIds, ["missing"]);
  assert.equal((await get("?page=999")).invalidPage, true);
  for (const path of [
    "?page=0",
    "?pageSize=51",
    "?sort=no",
    "?q[x]=bad",
    "?unknown=x",
    "?size=unknown",
    "/lookup",
    "/lookup?ids=bad%2Fid",
    "?lang=ar&lang=en",
  ])
    await get(path, 400);
  await get("/unknown", 404);
  assert.equal((await get("/filters")).groups.find((g) => g.key === "category").choices.length, 4);
  assert.ok((await get("/ghazal/related")).items.every((p) => p.id !== "ghazal"));
  // Equal-name fixture records live only in this explicitly disposable database.
  const template = await source.getRepository(CatalogProduct).findOneByOrFail({ id: "nabateen" });
  for (const id of ["tie-a", "tie-b"]) {
    await source
      .getRepository(CatalogProduct)
      .insert({ ...template, id, slug: id, featuredOrder: null });
    for (const locale of ["ar", "en"]) {
      const translation = await trRepo.findOneByOrFail({ productId: "nabateen", locale });
      await trRepo.insert({ ...translation, productId: id });
    }
  }
  const ties = [];
  for (let page = 1; page <= 3; page++)
    ties.push(...(await get(`?q=Nabatin&pageSize=1&page=${page}`)).items.map((p) => p.id));
  assert.deepEqual(ties, ["nabateen", "tie-a", "tie-b"]);
  await trRepo.delete({ productId: In(["tie-a", "tie-b"]) });
  await source.getRepository(CatalogProduct).delete(["tie-a", "tie-b"]);
  stage = "publication and field/translation protection";
  await source
    .getRepository(CatalogProduct)
    .update({ id: "ghazal-butter" }, { published: false, privateNotes: "INTERNAL_SENTINEL" });
  await get("/ghazal-butter", 404);
  assert.equal((await get()).totalPublished, 10);
  assert.equal((await get("/featured")).items.length, 3);
  assert.deepEqual((await get("/lookup?ids=ghazal-butter")).unavailableIds, ["ghazal-butter"]);
  assert.equal((await get("?q=INTERNAL_SENTINEL")).total, 0);
  const hidden = structuredClone(original.fields);
  hidden.aliases = { value: ["HIDDEN_ALIAS_SENTINEL"], published: false };
  hidden.ingredients = { value: "HIDDEN_INGREDIENT_SENTINEL", published: false };
  await trRepo.update({ productId: "ghazal", locale: "ar" }, { fields: hidden });
  for (const q of ["HIDDEN_ALIAS_SENTINEL", "HIDDEN_INGREDIENT_SENTINEL"])
    assert.equal((await get(`?q=${q}`)).total, 0);
  assert.ok(!JSON.stringify(await get("/ghazal")).includes("SENTINEL"));
  const production = new CatalogService(source, new DatabaseService(source, env), {
    ...env,
    nodeEnv: "production",
  });
  assert.equal((await production.list(parseCatalogQuery({}, []))).total, 0);
  await source
    .getRepository(CatalogProduct)
    .update({ id: "nabateen" }, { approvalScope: "approved" });
  assert.equal((await production.list(parseCatalogQuery({}, []))).total, 1);
  await trRepo.update({ productId: "ghazal", locale: "en" }, { published: false });
  const untranslated = await get("/ghazal?lang=en");
  assert.equal(untranslated.translationAvailable, false);
  assert.equal(untranslated.englishName, "");
  assert.ok((await get("?lang=en&pageSize=50")).items.some((p) => p.id === "ghazal"));
  await source.getRepository(CatalogPackage).update({ productId: "kawakeb" }, { published: false });
  assert.deepEqual((await get("/kawakeb")).sizes, []);
  stage = "safe failure and recovery";
  const liveSource = app.get(DATABASE_SOURCE);
  const query = liveSource.query.bind(liveSource);
  liveSource.query = async () => {
    throw new Error("PRIVATE_DATABASE_SENTINEL");
  };
  const failure = await get("", 503);
  assert.equal(failure.code, "SERVICE_UNAVAILABLE");
  assert.ok(!JSON.stringify(failure).includes("SENTINEL"));
  liveSource.query = query;
  await get();
  await app.close();
  app = undefined;
  stage = "rollback and restoration on disposable database";
  for (let i = 0; i < 7; i++) await source.undoLastMigration();
  const [remaining] = await source.query(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name LIKE 'catalog%'",
  );
  assert.equal(Number(remaining.n), 0);
  assert.equal((await source.runMigrations()).length, 7);
  await seedCatalog(source);
  assert.deepEqual(await snapshot(), originalSnapshot);
  const restored = await source
    .getRepository(CatalogProduct)
    .find({ order: { referenceOrder: "ASC" } });
  assert.deepEqual(
    restored.map((p) => p.id),
    baseline().map((p) => p.id),
  );
  assert.ok(restored.every((p) => p.published && p.approvalScope === "development"));
  const restoredPackages = await source.getRepository(CatalogPackage).find();
  assert.equal(restoredPackages.filter((p) => p.productId === "kawakeb").length, 3);
  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(
    ".tmp/catalog-verification.json",
    JSON.stringify({
      passed: true,
      checkedAt: new Date().toISOString(),
      scope: "disposable native catalog verification",
    }),
  );
  process.stdout.write(
    "PASS: real catalog migration/apply/idempotence/rollback/restoration, insert-only seed/editorial preservation, 11 products in both locales, filtering/search/sort/pagination/lookup/featured/related, publication and safe HTTP failure/recovery.\n",
  );
} catch {
  process.stderr.write(
    `Disposable catalog verification failed during: ${stage}. Secrets and SQL are not logged.\n`,
  );
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  if (source?.isInitialized) await source.destroy();
}

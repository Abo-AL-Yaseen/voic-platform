import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
const require = createRequire(import.meta.url);
async function load(file) {
  const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", js)(require, module, module.exports);
  return module.exports;
}
const { safeInternalPath } = await load("utils/navigation.ts");
const { queryClient, clearPrivateQueries } = await load("services/queryClient.ts");
const { inquiryKeys } = await load("hooks/inquiries/keys.ts");
const { inquiryPayload } = await load("utils/inquiryPayload.ts");
test("private inquiry scope includes identity/session and each server filter; payload excludes snapshots", () => {
  const filters = { q: "", status: "", sort: "desc", page: 1, pageSize: 10 };
  const key = JSON.stringify(inquiryKeys.customerList("customer-a", 1, filters));
  for (const patch of [
    { q: "VOIC-1" },
    { status: "draft" },
    { sort: "asc" },
    { page: 2 },
    { pageSize: 20 },
  ])
    assert.notEqual(
      JSON.stringify(inquiryKeys.customerList("customer-a", 1, { ...filters, ...patch })),
      key,
    );
  assert.notEqual(JSON.stringify(inquiryKeys.customerList("customer-b", 1, filters)), key);
  assert.notEqual(JSON.stringify(inquiryKeys.customerList("customer-a", 2, filters)), key);
  const p = inquiryPayload(
    1,
    "ar",
    {
      kind: "individual",
      name: "Test",
      company: "Former company",
      destination: "PS",
      phone: "",
      notes: "",
    },
    [
      {
        productId: "ghazal",
        packageId: null,
        quantity: null,
        unit: "kg",
        requirements: "Discuss packaging",
        snapshot: { name: "client fake" },
      },
    ],
  );
  assert.equal(p.fields.company, "");
  assert.equal(p.items[0].unit, null);
  assert.ok(!("snapshot" in p.items[0]));
});
test("auth return destinations reject foreign origins/loops and preserve only public selection", () => {
  for (const value of [
    "//attacker.invalid",
    "https://attacker.invalid",
    "/\\attacker",
    "/login?returnTo=/staff",
    "/%2f%2fexample",
    "/account\n",
  ])
    assert.equal(safeInternalPath(value), "/account");
  assert.equal(
    safeInternalPath("/inquiries/new?products=ghazal,nabateen&password=private#secret"),
    "/inquiries/new?products=ghazal%2Cnabateen",
  );
  assert.equal(safeInternalPath("/account/security?lang=de"), "/account/security");
});
test("logout cancellation prevents a late private response restoring old data and retains public catalog", async () => {
  queryClient.setQueryData(["products", "public"], [{ id: "ghazal" }]);
  queryClient.setQueryDefaults(["account", "old-user"], { meta: { private: true } });
  queryClient.setQueryData(["account", "old-user", "profile"], { name: "private" });
  // A write may seed inquiry detail before any useQuery has established its metadata.
  queryClient.setQueryData(["inquiries", "customer", "old-user", 2, "detail", "id"], {
    notes: "private draft",
  });
  assert.equal(
    queryClient
      .getQueryCache()
      .find({ queryKey: ["inquiries", "customer", "old-user", 2, "detail", "id"] }).meta.private,
    true,
  );
  let resolve,
    aborted = false;
  const response = queryClient
    .fetchQuery({
      queryKey: ["account", "old-user", "late"],
      meta: { private: true },
      queryFn: ({ signal }) => {
        signal.addEventListener("abort", () => {
          aborted = true;
        });
        return new Promise((r) => {
          resolve = r;
        });
      },
    })
    .catch(() => undefined);
  queryClient
    .getMutationCache()
    .build(queryClient, { meta: { private: true }, mutationFn: async () => ({ name: "private" }) });
  await clearPrivateQueries();
  resolve({ name: "late private response" });
  await response;
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(aborted, true);
  assert.equal(
    queryClient
      .getQueryCache()
      .getAll()
      .filter((q) => q.meta?.private).length,
    0,
  );
  assert.equal(queryClient.getMutationCache().getAll().length, 0);
  assert.deepEqual(queryClient.getQueryData(["products", "public"]), [{ id: "ghazal" }]);
  queryClient.clear();
});

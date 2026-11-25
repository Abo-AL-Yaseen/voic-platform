import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { OperationalLimits1795611600000 } from "../.tmp/auth-build/database/migrations/1795611600000-OperationalLimits.js";
import { auditWriterGrants } from "./native-security-administration.mjs";

export async function applyNativeRelease(admin, { local, grantTarget }) {
  assert.equal(local.DB_DATABASE, "voic_development");
  assert.equal(local.DB_USERNAME, "voic_app");
  const proof = JSON.parse(fs.readFileSync(".tmp/all-verification.json", "utf8"));
  assert.equal(proof.passed, true);
  assert.equal(proof.scope, "all");
  assert.equal(proof.releaseResult?.passed, true);
  assert.equal(proof.releaseResult?.restore?.passed, true);
  assert.equal(proof.releaseBrowserResult?.passed, true);
  assert.ok(Date.now() - Date.parse(proof.checkedAt) < 2 * 60 * 60_000);
  await admin.query("USE voic_development");
  const expected = [
    "PublicCatalog1795435200000",
    "CustomerAccounts1795478400000",
    "CustomerInquiries1795521600000",
    "StaffInquiryWorkflow1795525200000",
    "ContentWorkspace1795532400000",
    "StaffSecurity1795608000000",
    "OperationalLimits1795611600000",
  ];
  const [history] = await admin.query("SELECT name FROM voic_migrations ORDER BY id");
  assert.ok([6, 7].includes(history.length));
  assert.deepEqual(
    history.map((r) => r.name),
    expected.slice(0, history.length),
  );
  const [tables] = await admin.query(
    "SELECT TABLE_NAME name FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME NOT IN ('voic_migrations','operational_rate_limits') ORDER BY TABLE_NAME",
  );
  const snapshot = async () => {
    const result = {};
    for (const { name } of tables) {
      assert.match(name, /^[a-z_]+$/);
      const [rows] = await admin.query(`SELECT * FROM \`${name}\``);
      result[name] = {
        rows: rows.length,
        hash: createHash("sha256")
          .update(JSON.stringify(rows.map((r) => JSON.stringify(r)).sort()))
          .digest("hex"),
      };
    }
    return result;
  };
  const before = await snapshot();
  assert.equal(before.catalog_products.rows, 11);
  if (history.length === 6) {
    await new OperationalLimits1795611600000().up({
      query: async (sql, params) => (await admin.query(sql, params))[0],
    });
    await admin.query("INSERT INTO voic_migrations(timestamp,name) VALUES(?,?)", [
      1795611600000,
      expected[6],
    ]);
  }
  const grants = await auditWriterGrants(admin, {
    database: "voic_development",
    user: "voic_app",
    grantTarget,
    local,
  });
  assert.deepEqual(await snapshot(), before);
  const result = {
    passed: true,
    checkedAt: new Date().toISOString(),
    applied: history.length === 6 ? 1 : 0,
    preservedTables: tables.length,
    accountsAndMfaUnchanged: true,
    grants,
  };
  fs.writeFileSync(".tmp/release-development-verification.json", JSON.stringify(result));
  process.stdout.write(
    "PASS: native operational migration and VOIC-only runtime grants; all existing rows preserved.\n",
  );
}

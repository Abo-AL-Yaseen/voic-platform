import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import mysql from "mysql2/promise";
import { encryptionKey } from "../.tmp/auth-build/security/crypto.js";
import { StaffSecurity1795608000000 } from "../.tmp/auth-build/database/migrations/1795608000000-StaffSecurity.js";
const auditTables = ["staff_audit_events", "staff_editorial_events", "inquiry_audit_events"];
async function cleanupInterruptedDisposable(admin) {
  const file = ".tmp/previous-security-verification.json";
  if (!fs.existsSync(file)) return { matched: 0 };
  const evidence = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(evidence.passed, true);
  assert.match(evidence.mediaId, /^[a-f0-9-]{36}$/);
  assert.ok(Date.now() - Date.parse(evidence.checkedAt) < 24 * 60 * 60_000);
  const [schemas] = await admin.query(
    "SELECT TABLE_SCHEMA name FROM information_schema.tables WHERE TABLE_NAME='content_media'",
  );
  const matches = [];
  for (const { name } of schemas) {
    if (!/^voic_test_[a-f0-9]{16}$/.test(name)) continue;
    const [rows] = await admin.query(`SELECT id FROM \`${name}\`.content_media WHERE id=?`, [
      evidence.mediaId,
    ]);
    if (rows.length) matches.push(name);
  }
  // A random media identity from our successful verification establishes ownership;
  // a name pattern alone never authorizes removing an existing database/user.
  assert.ok(matches.length <= 1);
  for (const name of matches) {
    const [connections] = await admin.query(
      "SELECT ID FROM information_schema.processlist WHERE DB=?",
      [name],
    );
    assert.equal(connections.length, 0);
    const [users] = await admin.query("SELECT Host FROM mysql.user WHERE User=?", [name]);
    assert.equal(users.length, 1);
    assert.equal(users[0].Host, "localhost");
    const [grants] = await admin.query(`SHOW GRANTS FOR '${name}'@'localhost'`);
    for (const row of grants) {
      const g = Object.values(row)[0].replaceAll("\\_", "_");
      assert.ok(/^GRANT USAGE ON \*\.\* TO /.test(g) || g.includes(` ON \`${name}\`.`));
      assert.ok(!g.includes("WITH GRANT OPTION"));
    }
    const [migrations] = await admin.query(
      `SELECT name FROM \`${name}\`.voic_migrations ORDER BY id`,
    );
    assert.equal(migrations.length, 6);
    assert.equal(migrations.at(-1).name, "StaffSecurity1795608000000");
    await admin.query(`DROP DATABASE \`${name}\``);
    await admin.query(`DROP USER '${name}'@'localhost'`);
  }
  const result = {
    matched: matches.length,
    removedOnlyVerifiedOwned: true,
    checkedAt: new Date().toISOString(),
  };
  fs.writeFileSync(".tmp/interrupted-disposable-cleanup.json", JSON.stringify(result));
  return result;
}
export async function auditWriterGrants(admin, { database, user, grantTarget, local }) {
  assert.match(database, /^(voic_development|voic_test_[a-f0-9]{16})$/);
  assert.equal(user, database === "voic_development" ? "voic_app" : database);
  const [tables] = await admin.query(
    "SELECT TABLE_NAME name FROM information_schema.tables WHERE TABLE_SCHEMA=?",
    [database],
  );
  assert.ok(tables.some((t) => t.name === "staff_audit_events"));
  const [grants] = await admin.query(`SHOW GRANTS FOR '${user}'@'localhost'`);
  // Refuse account-wide, role, or foreign-database grants instead of changing unrelated access.
  for (const row of grants) {
    const g = Object.values(row)[0].replaceAll("\\_", "_");
    assert.ok(
      /^GRANT USAGE ON \*\.\* TO /.test(g) ||
        g.startsWith(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO `) ||
        g.includes(` ON \`${database}\`.`),
    );
    assert.ok(!g.includes("WITH GRANT OPTION"));
  }
  for (const t of tables) {
    assert.match(t.name, /^[a-z_]+$/);
    const rights = auditTables.includes(t.name)
      ? "SELECT, INSERT"
      : t.name === "voic_migrations"
        ? "SELECT"
        : "SELECT, INSERT, UPDATE, DELETE";
    await admin.query(`GRANT ${rights} ON \`${database}\`.\`${t.name}\` TO '${user}'@'localhost'`);
  }
  if (
    grants.some((r) =>
      Object.values(r)[0]
        .replaceAll("\\_", "_")
        .startsWith(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO `),
    )
  )
    await admin.query(
      `REVOKE ALL PRIVILEGES ON \`${grantTarget(database)}\`.* FROM '${user}'@'localhost'`,
    );
  const probe = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    database,
    user,
    password: local.DB_PASSWORD,
  });
  try {
    for (const t of auditTables) {
      await probe.query(`SELECT id FROM \`${t}\` LIMIT 1`);
      for (const operation of [
        `UPDATE \`${t}\` SET id=id WHERE 1=0`,
        `DELETE FROM \`${t}\` WHERE 1=0`,
      ])
        await assert.rejects(
          probe.query(operation),
          (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR",
        );
    }
    await assert.rejects(
      probe.query("CREATE TABLE forbidden_runtime_ddl (id int)"),
      (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR",
    );
  } finally {
    await probe.end();
  }
  return { auditTables: auditTables.length, updateDeleteDenied: true, runtimeDdlDenied: true };
}
export async function applyNativeSecurity(admin, { local, grantTarget }) {
  encryptionKey(local);
  {
    const r = JSON.parse(fs.readFileSync(".tmp/all-verification.json", "utf8"));
    assert.equal(r.passed, true);
    assert.ok(Date.now() - Date.parse(r.checkedAt) < 3 * 60 * 60_000);
    for (const key of [
      "securityResult",
      "securityBrowserResult",
      "browserResult",
      "inquiryResult",
      "inquiryBrowserResult",
      "staffResult",
      "staffBrowserResult",
      "contentResult",
      "contentBrowserResult",
    ])
      assert.equal(r[key].passed, true);
    assert.equal(r.catalogBrowserTests, 9);
  }
  assert.equal(local.DB_DATABASE, "voic_development");
  assert.equal(local.DB_USERNAME, "voic_app");
  const interruptedCleanup = await cleanupInterruptedDisposable(admin);
  await admin.query("USE voic_development");
  const expected = [
    "PublicCatalog1795435200000",
    "CustomerAccounts1795478400000",
    "CustomerInquiries1795521600000",
    "StaffInquiryWorkflow1795525200000",
    "ContentWorkspace1795532400000",
    "StaffSecurity1795608000000",
  ];
  const [migrations] = await admin.query("SELECT name FROM voic_migrations ORDER BY id");
  assert.deepEqual(
    migrations.map((r) => r.name),
    expected.slice(0, migrations.length),
  );
  assert.ok([5, 6].includes(migrations.length));
  const [columns] = await admin.query(
    "SELECT TABLE_NAME t,COLUMN_NAME c FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION",
  );
  const fields = {};
  for (const { t, c } of columns) {
    if (
      t === "voic_migrations" ||
      t.startsWith("staff_mfa_") ||
      [
        "staff_recovery_codes",
        "staff_audit_events",
        "staff_invitations",
        "staff_administration_lock",
      ].includes(t)
    )
      continue;
    if (
      [
        "suspendedAt",
        "staffRevision",
        "assurance",
        "authenticatedAt",
        "mfaAt",
        "attempts",
        "requestId",
      ].includes(c) &&
      ["auth_users", "auth_sessions", "inquiry_audit_events", "staff_editorial_events"].includes(t)
    )
      continue;
    (fields[t] ??= []).push(c);
  }
  const fingerprint = async () => {
    const out = {};
    for (const [t, names] of Object.entries(fields)) {
      assert.match(t, /^[a-z_]+$/);
      const [rows] = await admin.query(
        `SELECT ${names.map((n) => `\`${n}\``).join(",")} FROM \`${t}\``,
      );
      out[t] = {
        count: rows.length,
        digest: createHash("sha256")
          .update(JSON.stringify(rows.map((r) => JSON.stringify(r)).sort()))
          .digest("hex"),
      };
    }
    return out;
  };
  const before = await fingerprint();
  assert.equal(before.catalog_products.count, 11);
  if (migrations.length === 5) {
    await new StaffSecurity1795608000000().up({
      query: async (sql, params) => (await admin.query(sql, params))[0],
    });
    await admin.query("INSERT INTO voic_migrations (timestamp,name) VALUES (?,?)", [
      1795608000000,
      expected[5],
    ]);
  }
  assert.deepEqual(await fingerprint(), before);
  const grants = await auditWriterGrants(admin, {
    database: "voic_development",
    user: "voic_app",
    grantTarget,
    local,
  });
  assert.deepEqual(await fingerprint(), before);
  const result = {
    passed: true,
    checkedAt: new Date().toISOString(),
    applied: migrations.length === 5 ? 1 : 0,
    preservedTables: Object.keys(fields).length,
    accountsUnchanged: true,
    grants,
    interruptedCleanup,
  };
  fs.writeFileSync(".tmp/security-development-verification.json", JSON.stringify(result));
  process.stdout.write(
    "PASS: one additive native staff-security migration, existing rows/accounts preserved, audit UPDATE/DELETE and runtime DDL denied. No employee factor or password changed.\n",
  );
  return result;
}

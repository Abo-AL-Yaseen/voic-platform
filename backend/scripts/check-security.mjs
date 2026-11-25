import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import fs from "node:fs";
import { generate } from "otplib";
import { AuthUser, AuthSession } from "../.tmp/auth-build/auth/auth.entities.js";
import { StaffFactor, StaffRecovery } from "../.tmp/auth-build/security/security.entities.js";
import { provisionLocalStaff } from "../.tmp/auth-build/auth/local-staff.js";
import { loadEnvironment } from "../.tmp/auth-build/config/environment.js";
import { hashToken } from "../.tmp/auth-build/auth/auth.service.js";
import { totp } from "./test-staff-mfa.mjs";
export async function checkSecurity({ source, base, front, password, mailDir }) {
  let stage = "restricted sessions",
    lastRequest;
  const userRepo = source.getRepository(AuthUser),
    factors = new Map(),
    reason = "Disposable security verification";
  const client = () => ({
    cookie: "",
    csrf: "",
    id: "",
    email: "",
    async call(path, body, status = body === undefined ? 200 : 201) {
      const r = await fetch(base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Origin: front,
          Cookie: this.cookie,
          ...(body === undefined
            ? {}
            : { "Content-Type": "application/json", "X-CSRF-Token": this.csrf }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      lastRequest = { path, status: r.status, expected: status };
      this.lastStatus = r.status;
      assert.ok(
        (Array.isArray(status) ? status : [status]).includes(r.status),
        `Security ${stage}: ${path} (${r.status})`,
      );
      assert.equal(r.headers.get("cache-control"), "no-store");
      const cookie = r.headers.getSetCookie().find((c) => c.startsWith("voic_session="));
      if (cookie) this.cookie = cookie.split(";")[0];
      const d = await r.json();
      this.csrf = d.csrfToken || d.session?.csrfToken || this.csrf;
      return d;
    },
    async login(email) {
      await this.call("/auth/session");
      const r = await this.call("/auth/login", { email, password });
      this.id = r.user.id;
      this.email = email;
      return r;
    },
    async enroll() {
      const b = await this.call("/staff-security/enrollment", { password });
      await this.call("/staff/access", undefined, 403);
      const confirmedCode = await totp(b.secret);
      const r = await this.call("/staff-security/enrollment/confirm", { code: confirmedCode });
      factors.set(this.id, { secret: b.secret, confirmedCode, codes: r.recoveryCodes });
      assert.equal(r.recoveryCodes.length, 10);
      assert.equal(new Set(r.recoveryCodes).size, 10);
      return r;
    },
    async proof() {
      return { recoveryCode: factors.get(this.id).codes.shift() };
    },
    async fresh() {
      await this.call("/staff-security/reauthenticate", { password, ...(await this.proof()) });
    },
  });
  const create = async (email, role) =>
    provisionLocalStaff(source, loadEnvironment(), {
      mode: "create",
      email,
      role,
      password,
      name: "Security fixture",
      country: "PS",
      verifyDevelopment: true,
    });
  const a = client(),
    b = client(),
    sale = client(),
    editor = client();
  try {
    await create("security-admin@example.test", "administrator");
    const login = await a.login("security-admin@example.test");
    assert.equal(login.staffAuth, "enroll");
    const protectedPaths = [
      "/staff/access",
      "/staff/inquiries",
      "/staff/inquiries/stats",
      "/staff/content/products",
      "/staff/content/media",
      "/staff/employees",
      "/staff/audit",
    ];
    for (const p of protectedPaths) await a.call(p, undefined, 403);
    await a.call("/staff/content/media/upload", {}, 403);
    await a.call("/staff/invitations", {}, 403);
    await a.call("/staff-security/enrollment", { password: "wrong" }, 400);
    await a.enroll();
    const f = factors.get(a.id),
      stored = await source
        .getRepository(StaffFactor)
        .createQueryBuilder("f")
        .addSelect(["f.secret", "f.pending"])
        .where("f.userId=:id", { id: a.id })
        .getOneOrFail();
    assert.ok(!stored.secret.includes(f.secret));
    assert.equal(stored.pending, null);
    const old = { ...a };
    await a.login(a.email);
    assert.equal((await a.call("/auth/session")).staffAuth, "challenge");
    await a.call("/staff-security/challenge", { code: f.confirmedCode }, 400); // confirmed time step cannot be reused
    const used = f.codes.shift();
    await a.call("/staff-security/challenge", { recoveryCode: used });
    await old.call("/staff/access", undefined, 401);
    await a.login(a.email);
    await a.call("/staff-security/challenge", { recoveryCode: used }, 400);
    const same = f.codes.shift(),
      concurrent = { ...a };
    await Promise.all([
      a.call("/staff-security/challenge", { recoveryCode: same }, [201, 401, 403]),
      concurrent.call("/staff-security/challenge", { recoveryCode: same }, [201, 401, 403]),
    ]);
    assert.deepEqual([a.lastStatus, concurrent.lastStatus].sort(), [201, 401]);
    if (concurrent.lastStatus === 201) {
      a.cookie = concurrent.cookie;
      a.csrf = concurrent.csrf;
    }
    await a.call("/staff/access");
    const legacy = client();
    await legacy.login(a.email);
    await source.query(
      "UPDATE auth_sessions SET authenticatedAt=NULL,expiresAt=? WHERE tokenHash=?",
      [new Date(Date.now() + 12 * 60 * 60_000), hashToken(legacy.cookie.split("=")[1])],
    );
    await legacy.call("/staff/access", undefined, 403);
    await legacy.call("/staff-security/challenge", await a.proof(), 400);
    const one = client(),
      two = client();
    await one.login(a.email);
    await two.login(a.email);
    const oneCode = f.codes.shift();
    await Promise.all([
      one.call("/staff-security/challenge", { recoveryCode: oneCode }, [201, 400]),
      two.call("/staff-security/challenge", { recoveryCode: oneCode }, [201, 400]),
    ]);
    assert.deepEqual([one.lastStatus, two.lastStatus].sort(), [201, 400]);
    stage = "invitation and promotion";
    const invite = await a.call("/staff/invitations", {
      key: randomUUID(),
      email: "invited-security@example.test",
      role: "sales",
      reason,
      lang: "en",
    });
    assert.equal(invite.delivery, "captured");
    const findToken = () => {
      for (const name of fs
        .readdirSync(mailDir)
        .sort(
          (a, b) => fs.statSync(`${mailDir}/${b}`).mtimeMs - fs.statSync(`${mailDir}/${a}`).mtimeMs,
        )) {
        const m = JSON.parse(fs.readFileSync(`${mailDir}/${name}`, "utf8"));
        if (
          m.text.includes("/staff-invitation") &&
          JSON.stringify(m.to).includes("invited-security@example.test")
        ) {
          const url = new URL(m.text.split("\n").find((x) => x.startsWith(front)));
          return new URLSearchParams(url.hash.slice(1)).get("token");
        }
      }
      throw new Error("Captured invitation missing");
    };
    let token = findToken();
    const guest = client();
    await guest.call("/auth/session");
    await source.query("UPDATE staff_invitations SET expiresAt=? WHERE id=?", [
      new Date(0),
      invite.invitation.id,
    ]);
    await guest.call(
      "/staff-invitation/accept",
      { token, password, name: "Invited", country: "PS" },
      400,
    );
    await a.call(`/staff/invitations/${invite.invitation.id}/actions`, {
      key: randomUUID(),
      action: "resend",
      reason,
      lang: "en",
    });
    const rotated = findToken();
    assert.notEqual(token, rotated);
    await guest.call(
      "/staff-invitation/accept",
      { token, password, name: "Invited", country: "PS" },
      400,
    );
    token = rotated;
    await guest.call("/staff-invitation/accept", {
      token,
      password,
      name: "Invited",
      country: "PS",
    });
    await guest.call(
      "/staff-invitation/accept",
      { token, password, name: "Invited", country: "PS" },
      400,
    );
    await a.call(
      "/staff/invitations",
      { key: randomUUID(), email: "invited-security@example.test", role: "sales", reason },
      409,
    );
    const customer = client();
    await customer.call("/auth/session");
    await customer.call("/auth/register", {
      email: "security-customer@example.test",
      password,
      name: "Preserved",
      kind: "company",
      company: "Preserved company",
      country: "PS",
    });
    await customer.login("security-customer@example.test");
    assert.equal((await customer.call("/account/profile")).company, "Preserved company");
    const before = await userRepo
      .createQueryBuilder("u")
      .addSelect("u.passwordHash")
      .where("u.id=:id", { id: customer.id })
      .getOneOrFail();
    await a.call(`/staff/employees/${customer.id}/actions`, {
      key: randomUUID(),
      version: 0,
      action: "promote",
      expectedRole: "customer",
      role: "content_editor",
      reason,
    });
    const after = await userRepo
      .createQueryBuilder("u")
      .addSelect("u.passwordHash")
      .where("u.id=:id", { id: customer.id })
      .getOneOrFail();
    assert.equal(after.passwordHash, before.passwordHash);
    assert.equal(after.company, before.company);
    assert.equal(after.emailVerifiedAt, before.emailVerifiedAt);
    await customer.call("/account/profile", undefined, 401);
    stage = "role matrix and current state";
    await create("security-sales@example.test", "sales");
    await sale.login("security-sales@example.test");
    await sale.enroll();
    await create("security-editor@example.test", "content_editor");
    await editor.login("security-editor@example.test");
    await editor.enroll();
    for (const [c, allow, deny] of [
      [
        sale,
        ["/staff/inquiries", "/staff/inquiries/stats"],
        ["/staff/content/media", "/staff/content/products", "/staff/employees", "/staff/audit"],
      ],
      [
        editor,
        ["/staff/content/products", "/staff/content/media"],
        ["/staff/inquiries", "/staff/inquiries/stats", "/staff/employees", "/staff/audit"],
      ],
    ]) {
      for (const p of allow) await c.call(p);
      for (const p of deny) await c.call(p, undefined, 403);
    }
    const mutate = async (c, id, action, extra = {}) => {
      const u = await userRepo.findOneByOrFail({ id });
      return c.call(`/staff/employees/${id}/actions`, {
        key: randomUUID(),
        version: u.staffRevision,
        action,
        reason,
        ...extra,
      });
    };
    await mutate(a, sale.id, "suspend");
    await sale.call("/staff/inquiries", undefined, 401);
    await sale.login(sale.email).then(
      () => assert.fail("Suspended login allowed"),
      (e) => assert.ok(e),
    );
    await mutate(a, sale.id, "activate");
    await sale.login(sale.email);
    await sale.call("/staff-security/challenge", await sale.proof());
    await mutate(a, sale.id, "role", { role: "content_editor" });
    await sale.call("/staff/inquiries", undefined, 401);
    await sale.login(sale.email);
    await sale.call("/staff-security/challenge", await sale.proof());
    await sale.call("/staff/inquiries", undefined, 403);
    await mutate(a, sale.id, "revoke_sessions");
    await sale.call("/staff/access", undefined, 401);
    stage = "recent auth and controlled factor reset";
    await source.query("UPDATE auth_sessions SET authenticatedAt=? WHERE tokenHash=?", [
      new Date(Date.now() - 6 * 60_000),
      hashToken(a.cookie.split("=")[1]),
    ]);
    const version = (await userRepo.findOneByOrFail({ id: editor.id })).staffRevision;
    await a.call(
      `/staff/employees/${editor.id}/actions`,
      { key: randomUUID(), version, action: "reset_mfa", reason },
      403,
    );
    await a.fresh();
    await mutate(a, editor.id, "reset_mfa");
    await editor.call("/staff/content/products", undefined, 401);
    await editor.login(editor.email);
    assert.equal((await editor.call("/auth/session")).staffAuth, "enroll");
    await editor.enroll();
    stage = "factor replacement and regeneration";
    const previous = f.codes.slice(),
      setup = await a.call("/staff-security/enrollment", { password, ...(await a.proof()) });
    const replacement = await a.call("/staff-security/enrollment/confirm", {
      code: await totp(setup.secret),
    });
    f.secret = setup.secret;
    f.codes = replacement.recoveryCodes;
    await old.call("/staff/access", undefined, 401);
    const staleCode = f.codes[0],
      regen = await a.call("/staff-security/recovery-codes", { password, ...(await a.proof()) });
    f.codes = regen.recoveryCodes;
    await a.call("/staff-security/reauthenticate", { password, recoveryCode: staleCode }, 400);
    await a.call("/staff-security/reauthenticate", { password, recoveryCode: previous[0] }, 400);
    stage = "password reset preserves staff factor";
    const unchangedFactor = await source.query(
      "SELECT secret FROM staff_mfa_factors WHERE userId=?",
      [editor.id],
    );
    await guest.call("/auth/password/forgot", {
      email: editor.email,
      lang: "en",
      returnTo: "/staff",
    });
    let resetToken;
    for (const name of fs.readdirSync(mailDir)) {
      const m = JSON.parse(fs.readFileSync(`${mailDir}/${name}`, "utf8"));
      if (JSON.stringify(m.to).includes(editor.email) && m.text.includes("/reset-password")) {
        const url = new URL(m.text.split("\n").find((x) => x.startsWith(front)));
        resetToken = new URLSearchParams(url.hash.slice(1)).get("token");
      }
    }
    assert.ok(resetToken);
    await guest.call("/auth/password/reset", { token: resetToken, password });
    assert.deepEqual(
      await source.query("SELECT secret FROM staff_mfa_factors WHERE userId=?", [editor.id]),
      unchangedFactor,
    );
    await editor.call("/staff/content/products", undefined, 401);
    await editor.login(editor.email);
    assert.equal((await editor.call("/auth/session")).staffAuth, "challenge");
    await editor.call("/staff-security/challenge", await editor.proof());
    stage = "challenge attempts expiry and concurrent last administrator";
    const limited = client();
    await limited.login(editor.email);
    for (let n = 0; n < 5; n++)
      await limited.call("/staff-security/challenge", { code: "000000" }, 400);
    await limited.call("/staff/access", undefined, 401);
    await limited.call("/auth/session");
    await limited.login(editor.email);
    await source.query("UPDATE auth_sessions SET expiresAt=? WHERE tokenHash=?", [
      new Date(0),
      hashToken(limited.cookie.split("=")[1]),
    ]);
    await limited.call("/staff-security/challenge", { code: "000000" }, 403);
    await create("security-second@example.test", "administrator");
    await b.login("security-second@example.test");
    await b.enroll();
    const results = await Promise.all(
      [a, b].map(async (c) => {
        const u = await userRepo.findOneByOrFail({ id: c.id });
        const r = await fetch(base + `/staff/employees/${c.id}/actions`, {
          method: "POST",
          headers: {
            Origin: front,
            Cookie: c.cookie,
            "X-CSRF-Token": c.csrf,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: randomUUID(),
            version: u.staffRevision,
            action: "role",
            role: "sales",
            reason,
          }),
        });
        return r.status;
      }),
    );
    assert.deepEqual(results.sort(), [201, 409]);
    assert.equal(await userRepo.countBy({ role: "administrator" }), 1);
    const survivor =
      (await userRepo.findOneByOrFail({ role: "administrator" })).id === a.id ? a : b;
    await survivor.call(
      `/staff/employees/${survivor.id}/actions`,
      {
        key: randomUUID(),
        version: (await userRepo.findOneByOrFail({ id: survivor.id })).staffRevision,
        action: "suspend",
        reason,
      },
      409,
    );
    stage = "safe consolidated audit";
    const log = await survivor.call("/staff/audit?pageSize=50");
    assert.ok(log.items.some((e) => e.action === "security.mfa_enrolled"));
    assert.ok(log.items.some((e) => e.action === "employees.promote"));
    const body = JSON.stringify(log);
    for (const secret of [password, token, ...f.codes, f.secret]) assert.ok(!body.includes(secret));
    assert.ok(log.items.every((e) => e.requestId && e.actorRole));
    await survivor.call("/staff/audit?pageSize=51", undefined, 400);
    await survivor.call("/staff/audit?from=2026-02-31T00:00:00Z",undefined,400);
    await survivor.call("/staff/audit?actor=------------------------------------",undefined,400);
    await survivor.call("/staff/audit?from=bad", undefined, 400);
    await survivor.call("/staff/audit?action=%27OR1=1", undefined, 400);
    fs.rmSync(".tmp/security-failure.json", { force: true });
    return {
      passed: true,
      restricted: true,
      invitation: true,
      promotionPreserved: true,
      roles: true,
      lastAdminConcurrent: true,
      recoveryConcurrent: true,
      replay: true,
      reset: true,
      passwordResetPreservesMfa: true,
      audit: true,
    };
  } catch (e) {
    fs.writeFileSync(
      ".tmp/security-failure.json",
      JSON.stringify({
        stage,
        lastRequest,
        kind: e.name,
        trace: e.stack
          ?.split("\n")
          .filter((line) => /^\s+at /.test(line))
          .slice(0, 6),
        dbCode: e.driverError?.code,
        hint: [
          "Local target required",
          "Invalid local staff identity",
          "Invalid new staff profile",
        ].includes(e.message)
          ? e.message
          : undefined,
        actual: typeof e.actual === "number" ? e.actual : undefined,
        expected: typeof e.expected === "number" ? e.expected : undefined,
      }),
    );
    throw new Error(`Security verification: ${stage}`);
  }
}

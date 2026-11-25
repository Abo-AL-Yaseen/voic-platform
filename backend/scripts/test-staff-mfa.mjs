import assert from "node:assert/strict";
import { generate } from "otplib";
// Disposable verification only. No application bypass: every transition uses real HTTP.
const factors = new Map();
export const totp = (secret) =>
  generate({ strategy: "totp", secret, algorithm: "sha1", digits: 6, period: 30 });
export async function completeStaff(call, email, password) {
  let session = await call("/auth/session");
  if (!session.user || session.user.role === "customer") return session;
  const id = session.user.id;
  if (session.staffAuth === "enroll") {
    const enrollment = await call("/staff-security/enrollment", { password });
    const r = await call("/staff-security/enrollment/confirm", {
      code: await totp(enrollment.secret),
    });
    factors.set(id, { secret: enrollment.secret, codes: r.recoveryCodes });
    session = r.session;
  } else if (session.staffAuth === "challenge") {
    const f = factors.get(id);
    assert.ok(f?.codes.length, "Disposable factor proof must be available");
    session = await call("/staff-security/challenge", { recoveryCode: f.codes.shift() });
  }
  assert.equal(session.staffAuth, "complete");
  const f = factors.get(id);
  if (f && f.codes.length < 3) {
    const r = await call("/staff-security/recovery-codes", {
      password,
      recoveryCode: f.codes.shift(),
    });
    f.codes = r.recoveryCodes;
    session = r.session;
  }
  return session;
}
export async function completeBrowserMfa(page, base, email, password, lang = "en") {
  await page.waitForURL((u) => ["/staff", "/staff/security"].includes(u.pathname));
  let csrf = "";
  const call = async (route, body) => {
    const r =
      body === undefined
        ? await page.request.get(base + route)
        : await page.request.post(base + route, {
            headers: { Origin: new URL(page.url()).origin, "X-CSRF-Token": csrf },
            data: body,
          });
    assert.equal(r.status(), body === undefined ? 200 : 201, `MFA regression route ${route}`);
    const data = await r.json();
    csrf = data.csrfToken || data.session?.csrfToken || csrf;
    return data;
  };
  await completeStaff(call, email, password);
  await page.goto(`/staff?lang=${lang}`);
}

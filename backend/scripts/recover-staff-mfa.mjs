import "reflect-metadata";
import { createInterface } from "node:readline/promises";
import { DataSource } from "typeorm";
import { loadEnvironment } from "../.tmp/security-build/config/environment.js";
import { databaseOptions } from "../.tmp/security-build/database/options.js";
import { AuthUser, AuthSession } from "../.tmp/security-build/auth/auth.entities.js";
import { StaffFactor, StaffRecovery } from "../.tmp/security-build/security/security.entities.js";
import { administrationLock, audit } from "../.tmp/security-build/security/audit.js";
if (!process.stdin.isTTY || !process.stdout.isTTY)
  throw new Error("Interactive local operator required");
const prompt = createInterface({ input: process.stdin, output: process.stdout });
let source;
try {
  const env = loadEnvironment();
  if (
    env.nodeEnv !== "development" ||
    env.dbHost !== "127.0.0.1" ||
    env.dbPort !== 3306 ||
    env.dbDatabase !== "voic_development" ||
    env.dbUsername !== "voic_app"
  )
    throw new Error("Native development target required");
  source = new DataSource(databaseOptions(env));
  await source.initialize();
  const email = (await prompt.question("Existing administrator email: ")).trim().toLowerCase();
  const user = await source.getRepository(AuthUser).findOneBy({ email, role: "administrator" });
  if (!user || user.suspendedAt) throw new Error("Active administrator required");
  const reason = (
    await prompt.question("Recovery reason (10-500 characters, no secrets): ")
  ).trim();
  if (reason.length < 10 || reason.length > 500) throw new Error("Reason required");
  const confirmation = await prompt.question(
    `Review identity ${user.id}. Type RECOVER ${user.id} to clear only its factor and revoke sessions: `,
  );
  if (confirmation !== `RECOVER ${user.id}`) throw new Error("Cancelled");
  await source.transaction("READ COMMITTED", async (m) => {
    await administrationLock(m);
    const u = await m
      .getRepository(AuthUser)
      .createQueryBuilder("u")
      .addSelect("u.securityVersion")
      .where("u.id=:id", { id: user.id })
      .setLock("pessimistic_write")
      .getOneOrFail();
    if (u.role !== "administrator" || u.suspendedAt || u.email !== email)
      throw new Error("Identity changed");
    await m.delete(StaffRecovery, { userId: u.id });
    await m.delete(StaffFactor, { userId: u.id });
    await m.delete(AuthSession, { userId: u.id });
    await m.update(
      AuthUser,
      { id: u.id },
      { securityVersion: u.securityVersion + 1, staffRevision: u.staffRevision + 1 },
    );
    await audit(m, null, "operator.mfa_recovery", u.id, { reason, local: true });
  });
  process.stdout.write(
    "Factor cleared and sessions revoked. Password/profile unchanged. Next password sign-in MUST enroll MFA; no staff access is granted by this tool.\n",
  );
} catch {
  process.stderr.write(
    "Recovery stopped. Review the local target and explicit identity/confirmation; no secrets are logged.\n",
  );
  process.exitCode = 1;
} finally {
  prompt.close();
  if (source?.isInitialized) await source.destroy();
}

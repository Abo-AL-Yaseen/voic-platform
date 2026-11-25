import "reflect-metadata";
import { Writable } from "node:stream";
import { createInterface } from "node:readline/promises";
import { DataSource } from "typeorm";
import { loadEnvironment } from "../.tmp/staff-build/config/environment.js";
import { databaseOptions } from "../.tmp/staff-build/database/options.js";
import { AuthUser } from "../.tmp/staff-build/auth/auth.entities.js";
import { provisionLocalStaff } from "../.tmp/staff-build/auth/local-staff.js";
import { authConfiguration } from "../.tmp/staff-build/auth/auth.config.js";
import { MailService } from "../.tmp/staff-build/auth/mail.service.js";
if (!process.stdin.isTTY || !process.stdout.isTTY || process.argv.length !== 2) {
  process.stderr.write(
    "Run locally in an interactive terminal (Git Bash: winpty node scripts/provision-local-staff.mjs). Do not pass identity/password arguments.\n",
  );
  process.exit(1);
}
let muted = false,
  source;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const prompt = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
try {
  const env = loadEnvironment(),
    config = authConfiguration(env);
  if (
    env.nodeEnv !== "development" ||
    env.dbHost !== "127.0.0.1" ||
    env.dbPort !== 3306 ||
    env.dbDatabase !== "voic_development" ||
    env.dbUsername !== "voic_app" ||
    config.mode !== "capture"
  )
    throw new Error("Native local development capture target required");
  source = new DataSource(databaseOptions(env));
  await source.initialize();
  const mode = (await prompt.question("Action [create/promote]: ")).trim();
  if (!["create", "promote"].includes(mode)) throw new Error("Action required");
  const email = (await prompt.question("Staff email: ")).trim().toLowerCase();
  const role = (await prompt.question("Role [sales/administrator/content_editor]: ")).trim();
  if (!["sales", "administrator", "content_editor"].includes(role))
    throw new Error("Role required");
  const existing = await source.getRepository(AuthUser).findOneBy({ email });
  if (mode === "create" && existing)
    throw new Error("Account already exists; choose explicit promote after review");
  if (mode === "promote" && !existing) throw new Error("Account not found");
  if (existing)
    process.stdout.write(
      JSON.stringify({
        id: existing.id,
        email: existing.email,
        name: existing.name,
        currentRole: existing.role,
        emailVerified: !!existing.emailVerifiedAt,
      }) + "\n",
    );
  process.stdout.write(
    `Target: native voic_development; ${mode} ${email} with role ${role}. Existing password/profile will not be changed. Existing sessions will be revoked on promotion.\n`,
  );
  const verify =
    (await prompt.question(
      `Development-only email verification shortcut? Type DEV VERIFY ${email} to explicitly mark verified, or Enter for genuine capture verification: `,
    )) === `DEV VERIFY ${email}`;
  let name, country, password;
  if (mode === "create") {
    name = (await prompt.question("Display name: ")).trim();
    country = (await prompt.question("Country: ")).trim();
    process.stdout.write("New staff password (hidden, 15-128 characters): ");
    muted = true;
    password = await prompt.question("");
    muted = false;
    process.stdout.write("\n");
    process.stdout.write("Confirm password (hidden): ");
    muted = true;
    let confirmation = await prompt.question("");
    muted = false;
    process.stdout.write("\n");
    if (password !== confirmation) throw new Error("Passwords do not match");
    confirmation = undefined;
  }
  const confirmation = `${mode.toUpperCase()} ${email} AS ${role}`;
  if ((await prompt.question(`Confirm exact change by typing ${confirmation}: `)) !== confirmation)
    throw new Error("Not confirmed; no change");
  const result = await provisionLocalStaff(source, env, {
    mode,
    email,
    role,
    name,
    country,
    password,
    verifyDevelopment: verify,
    expectedId: existing?.id,
    expectedRole: existing?.role,
  });
  password = undefined;
  if (result.verificationToken) {
    await new MailService(config).send(email, "verify", result.verificationToken, "ar", "/staff");
    result.verificationToken = null;
  }
  process.stdout.write(
    `Local staff change completed. Email ${result.verified ? "explicitly verified for development" : "requires genuine verification; review the local capture privately or use resend"}. No password/token is printed or saved outside the existing private capture.\n`,
  );
} catch (error) {
  muted = false;
  const allowed = [
    "Account already exists; choose explicit promote after review",
    "Account not found",
    "Passwords do not match",
    "Not confirmed; no change",
  ];
  process.stderr.write(
    allowed.includes(error.message)
      ? `${error.message}.\n`
      : "Local staff provisioning stopped safely. Check local target, identity, inputs and documented preconditions; no credentials or SQL are logged.\n",
  );
  process.exitCode = 1;
} finally {
  prompt.close();
  if (source?.isInitialized) await source.destroy();
}

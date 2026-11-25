import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
const file = ".env";
if (!fs.existsSync(file)) throw new Error("Create the ignored backend .env first.");
const original = fs.readFileSync(file, "utf8"),
  value = parseEnv(original).MFA_ENCRYPTION_KEY;
if (value) {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value)
    throw new Error(
      "Existing MFA_ENCRYPTION_KEY is invalid; review locally. No replacement performed.",
    );
  process.stdout.write("Existing MFA key retained. No secret displayed.\n");
} else {
  const line = `MFA_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`;
  const updated = /^MFA_ENCRYPTION_KEY=.*$/m.test(original)
    ? original.replace(/^MFA_ENCRYPTION_KEY=.*$/m, line)
    : `${original.trimEnd()}\n\n${line}\n`;
  fs.writeFileSync(file, updated, { mode: 0o600 });
  process.stdout.write(
    "Generated MFA key only in ignored backend .env. Back it up privately; losing it requires controlled factor recovery.\n",
  );
}

import fs from "node:fs";
import { randomBytes } from "node:crypto";

try {
  const text = fs
    .readFileSync(".env.example", "utf8")
    .replace("replace-with-a-unique-local-app-password", randomBytes(32).toString("hex"))
    .replace("replace-with-a-different-local-root-password", randomBytes(32).toString("hex"));
  fs.writeFileSync(".env", text, { flag: "wx" });
  process.stdout.write("Created local .env with generated secrets. Values are not displayed.\n");
} catch {
  process.stderr.write(
    "Could not create .env. Run from backend/ and do not overwrite an existing local file.\n",
  );
  process.exitCode = 1;
}

import "reflect-metadata";
import { DataSource } from "typeorm";
import { loadEnvironment } from "../dist/config/environment.js";
import { databaseOptions } from "../dist/database/options.js";
import { cleanupExpiredSecurity } from "../dist/operations/cleanup.js";

// Expired security records only. Business records, audit, notifications and media are retained.
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== "--apply"))
  throw new Error("Use no argument for dry-run, or --apply");
const source = new DataSource(databaseOptions(loadEnvironment()));
try {
  await source.initialize();
  process.stdout.write(
    JSON.stringify(await cleanupExpiredSecurity(source, args[0] === "--apply")) + "\n",
  );
} catch {
  process.stderr.write(
    "Operational cleanup failed. Check migration and runtime grants; no business cleanup is performed.\n",
  );
  process.exitCode = 1;
} finally {
  if (source.isInitialized) await source.destroy();
}

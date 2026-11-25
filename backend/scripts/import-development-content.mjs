import "reflect-metadata";
import { loadEnvironment } from "../.tmp/content-build/config/environment.js";
import { databaseOptions } from "../.tmp/content-build/database/options.js";
import { importDevelopmentContent } from "../.tmp/content-build/content/import.js";
import { DataSource } from "typeorm";
let s;
try {
  const env = loadEnvironment();
  if (
    env.nodeEnv !== "development" ||
    env.dbHost !== "127.0.0.1" ||
    env.dbDatabase !== "voic_development" ||
    env.dbUsername !== "voic_app" ||
    process.env.CONFIRM_DEVELOPMENT_CONTENT !== "yes"
  )
    throw new Error();
  s = new DataSource(databaseOptions(env));
  await s.initialize();
  console.log(JSON.stringify(await importDevelopmentContent(s)));
} catch {
  process.stderr.write(
    "Development content import refused or failed. Review target/migrations and explicit confirmation; no existing document is overwritten.\n",
  );
  process.exitCode = 1;
} finally {
  if (s?.isInitialized) await s.destroy();
}

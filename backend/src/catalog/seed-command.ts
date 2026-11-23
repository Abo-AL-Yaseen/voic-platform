import "reflect-metadata";
import { loadEnvironment } from "../config/environment.js";
import { seedCatalog } from "./seed.js";

try {
  const env = loadEnvironment();
  if (
    env.nodeEnv !== "development" ||
    env.dbDatabase !== "voic_development" ||
    process.env.CONFIRM_DEVELOPMENT_CATALOG !== "yes"
  )
    throw new Error("Explicit development import confirmation required");
  const { default: source } = await import("../database/data-source.js");
  try {
    await source.initialize();
    const result = await seedCatalog(source);
    process.stdout.write(
      `Catalog development import: inserted ${result.inserted}, preserved ${result.skipped} existing product(s).\n`,
    );
  } finally {
    if (source.isInitialized) await source.destroy();
  }
} catch {
  process.stderr.write(
    "Catalog import failed. Check migrations, target and explicit development confirmation; existing records are never overwritten.\n",
  );
  process.exitCode = 1;
}

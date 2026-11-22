import { ConfigurationError } from "../config/environment.js";

async function main(): Promise<void> {
  const action = process.argv[2];
  if (!["check", "show", "run", "revert"].includes(action ?? ""))
    throw new Error("Unsupported command");
  const { default: source } = await import("./data-source.js");
  try {
    await source.initialize();
    if (action === "check") {
      const [row] = await source.query("SELECT @@default_storage_engine AS engine");
      if (row?.engine?.toLowerCase() !== "innodb") throw new Error("Storage engine mismatch");
      process.stdout.write("Database connection and InnoDB check passed.\n");
    } else if (action === "show") {
      const pending = await source.showMigrations();
      process.stdout.write(pending ? "Pending migrations exist.\n" : "No pending migrations.\n");
    } else if (action === "run") {
      const applied = await source.runMigrations();
      process.stdout.write(`Applied ${applied.length} migration(s).\n`);
    } else {
      // Rollback must be an explicit operator decision, never part of API startup.
      if (process.env.CONFIRM_MIGRATION_REVERT !== "yes")
        throw new Error("Revert confirmation required");
      await source.undoLastMigration();
      process.stdout.write("Last migration reverted, if present.\n");
    }
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

main().catch((error) => {
  process.stderr.write(
    error instanceof ConfigurationError
      ? `${error.message}\n`
      : "Database command failed. Check configuration, connectivity, grants and the documented command preconditions.\n",
  );
  process.exitCode = 1;
});

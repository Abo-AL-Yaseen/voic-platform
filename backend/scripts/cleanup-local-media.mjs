import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { DataSource } from "typeorm";
import { loadEnvironment } from "../.tmp/content-build/config/environment.js";
import { databaseOptions } from "../.tmp/content-build/database/options.js";
import { ContentMedia, EditorialEvent } from "../.tmp/content-build/content/content.entities.js";
import { LocalMediaStorage } from "../.tmp/content-build/content/media.service.js";
let source;
try {
  const env = loadEnvironment();
  if (
    env.nodeEnv !== "development" ||
    env.dbDatabase !== "voic_development" ||
    env.dbUsername !== "voic_app" ||
    env.dbHost !== "127.0.0.1" ||
    !["", "--apply"].includes(process.argv.slice(2).join(" "))
  )
    throw new Error();
  source = new DataSource(databaseOptions(env));
  await source.initialize();
  const storage = new LocalMediaStorage(),
    root = await storage.rootReady();
  const uploads = await source
    .getRepository(EditorialEvent)
    .find({ where: { action: "upload" }, select: { revisionId: true } });
  const owned = new Set(uploads.map((x) => x.revisionId));
  let candidates = 0,
    removed = 0;
  for (const name of await fs.readdir(root)) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(name)) continue;
    let journalOwned = false;
    try {
      const journalPath = path.join(root, `.owned-${name}.json`);
      if (
        (await fs.lstat(journalPath)).isFile() &&
        (await fs.realpath(journalPath)) === journalPath
      ) {
        const j = JSON.parse(await fs.readFile(journalPath, "utf8"));
        journalOwned = j.filename === name && Number.isFinite(Date.parse(j.createdAt));
      }
    } catch {}
    if (!journalOwned && !owned.has(name.slice(0, -5))) continue;
    const file = path.join(root, name),
      stat = await fs.lstat(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      Date.now() - stat.mtimeMs < 24 * 60 * 60 * 1000 ||
      (await source.getRepository(ContentMedia).existsBy({ filename: name }))
    )
      continue;
    candidates++;
    if (process.argv.includes("--apply")) {
      await storage.remove(name);
      removed++;
    }
  }
  console.log(
    JSON.stringify({
      dryRun: !process.argv.includes("--apply"),
      ownedOrphansOlderThan24Hours: candidates,
      removed,
    }),
  );
} catch {
  process.stderr.write(
    "Owned media cleanup refused or failed. Unknown files, original assets and referenced media are never removed.\n",
  );
  process.exitCode = 1;
} finally {
  if (source?.isInitialized) await source.destroy();
}

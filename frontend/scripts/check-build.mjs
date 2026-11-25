import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
const root = path.resolve("dist"),
  chunks = [], assets=[];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name),
      relative = path.relative(root, file).replaceAll("\\", "/");
    assert.ok(!entry.isSymbolicLink());
    assert.ok(
      !/(^|\/)(\.env|\.tmp|node_modules|src|docs)(\/|$)|\.map$|\.(sql|dump|pem|key)$/.test(
        relative,
      ),
    );
    if (entry.isDirectory()) walk(file);
    else if (/\.(js|html)$/.test(file)) {
      const data = fs.readFileSync(file),
        text = data.toString("utf8");
      for (const marker of [
        "Preview dashboard",
        "PreviewPage.tsx",
        "__FIGMA__.stories",
        "BEGIN PRIVATE KEY",
        "DB_PASSWORD=",
        "MFA_ENCRYPTION_KEY=",
      ])
        assert.ok(!text.includes(marker), "Private/development marker in production output");
      if (file.endsWith(".js"))
        chunks.push({ file: relative, bytes: data.length, gzipBytes: gzipSync(data).length });
    } else assets.push({file:relative,bytes:fs.statSync(file).size});
  }
}
walk(root);
assert.match(
  fs.readFileSync(path.join(root, "index.html"), "utf8"),
  /name="robots" content="noindex, nofollow"/,
);
assert.match(fs.readFileSync(path.join(root, "robots.txt"), "utf8"), /Disallow: \//);
assert.ok(chunks.some((c) => c.file.includes("StaffSecurityPages")));
assert.ok(chunks.some((c) => c.file.includes("EditorialPages")));
fs.mkdirSync(".tmp", { recursive: true });
fs.writeFileSync(
  ".tmp/build-verification.json",
  JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), chunks,
    staticAssetBytes:assets.reduce((sum,x)=>sum+x.bytes,0),largestAssets:assets.sort((a,b)=>b.bytes-a.bytes).slice(0,8) }),
);
console.log(
  `PASS: production output exposure/indexing gate and ${chunks.length} JavaScript chunks.`,
);

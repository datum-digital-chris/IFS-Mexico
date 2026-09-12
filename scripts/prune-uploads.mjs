#!/usr/bin/env node
/**
 * Keep only the uploads the built site actually references.
 *
 * wp-cache/uploads holds everything the old site referenced anywhere, including
 * the WordPress size variants that only ever appeared in `srcset`. Extraction
 * drops srcset, so most of those are dead weight - and public/ is committed,
 * so dead weight here is dead weight in the repo forever.
 *
 * wp-cache/ remains the complete archive; this only prunes what gets published.
 *
 *   node scripts/prune-uploads.mjs --dry-run
 */
import { readFileSync, readdirSync, statSync, rmSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const P = (...p) => join(ROOT, ...p);
const DRY = process.argv.includes("--dry-run");

const walk = (dir) =>
  !existsSync(dir)
    ? []
    : readdirSync(dir).flatMap((f) => {
        const full = join(dir, f);
        return statSync(full).isDirectory() ? walk(full) : [full];
      });

// Every /uploads/ path referenced by the built output.
const referenced = new Set();
for (const file of walk(P("dist")).filter((f) => /\.(html|css|js|xml)$/.test(f))) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/\/uploads\/[^\s"')>&]+/g)) {
    referenced.add(decodeURIComponent(m[0].replace(/&quot;.*$/, "")));
  }
}

const all = walk(P("wp-cache/uploads")).map((f) => "/uploads/" + relative(P("wp-cache/uploads"), f));
const keep = all.filter((p) => referenced.has(p));
const drop = all.filter((p) => !referenced.has(p));

const size = (paths, base) =>
  paths.reduce((n, p) => {
    try {
      return n + statSync(join(base, p.replace("/uploads/", ""))).size;
    } catch {
      return n;
    }
  }, 0);

const mb = (n) => (n / 1024 / 1024).toFixed(1) + "MB";
console.log(`referenced by build : ${referenced.size}`);
console.log(`in archive          : ${all.length} (${mb(size(all, P("wp-cache/uploads")))})`);
console.log(`keep                : ${keep.length} (${mb(size(keep, P("wp-cache/uploads")))})`);
console.log(`prune               : ${drop.length} (${mb(size(drop, P("wp-cache/uploads")))})`);

const missing = [...referenced].filter((p) => !all.includes(p));
if (missing.length) {
  console.error(`\nreferenced but not in the archive (${missing.length}):`);
  for (const m of missing.slice(0, 10)) console.error(`  ${m}`);
  process.exit(1);
}

if (DRY) {
  console.log("\ndry run - nothing changed");
  process.exit(0);
}

// Rebuild public/uploads from the archive, keeping only what is referenced.
rmSync(P("public/uploads"), { recursive: true, force: true });
for (const p of keep) {
  const rel = p.replace("/uploads/", "");
  const dest = P("public/uploads", rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(P("wp-cache/uploads", rel), dest);
}
console.log(`\npublic/uploads rebuilt: ${keep.length} files`);

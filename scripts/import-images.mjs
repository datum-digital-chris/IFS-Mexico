#!/usr/bin/env node
/**
 * Copy the market imagery in from the IFS Coatings US site's library.
 *
 * The Mexican site has no market photography beyond one bare photo band per
 * page, so the market template sources its hero and supporting images from the
 * US repo (cfg.marketsSource). Images are resized to a sensible web cap on the
 * way in — the originals are up to 3000×4500 and 1.9MB.
 *
 *   node scripts/import-images.mjs --dry-run
 */
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { execFileSync } from "node:child_process";
import cfg from "./site.config.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "public/uploads/markets");
const DRY = process.argv.includes("--dry-run");
const CAP = 2000; // px on the long edge

if (!existsSync(cfg.marketsSource)) {
  console.error(`source not found: ${cfg.marketsSource}`);
  process.exit(1);
}

if (!DRY) mkdirSync(OUT, { recursive: true });

let copied = 0;
let bytes = 0;
const missing = [];

for (const [slug, images] of Object.entries(cfg.markets)) {
  for (const [role, rel] of Object.entries(images)) {
    if (!rel) continue;
    const src = join(cfg.marketsSource, rel);
    if (!existsSync(src)) {
      missing.push(`${slug}/${role}: ${rel}`);
      continue;
    }
    const dest = join(OUT, `${slug}-${role}${extname(rel)}`);
    if (DRY) {
      console.log(`${slug.padEnd(36)} ${role.padEnd(8)} ${basename(rel)}`);
      copied++;
      continue;
    }
    copyFileSync(src, dest);
    try {
      // Cap the long edge, then re-encode: several of these are already small
      // enough in pixels but are 2MB JPEGs, so resizing alone does nothing.
      execFileSync("sips", ["-Z", String(CAP), dest], { stdio: "ignore" });
      if (/\.jpe?g$/i.test(dest)) {
        execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72", dest], { stdio: "ignore" });
      }
    } catch {
      /* sips cannot write some formats; the copy still stands */
    }
    bytes += statSync(dest).size;
    copied++;
  }
}

console.log(`\nimages ${DRY ? "to import" : "imported"}: ${copied}${DRY ? "" : ` (${(bytes / 1024 / 1024).toFixed(1)}MB)`}`);
if (missing.length) {
  console.error(`\nnot found in the source library (${missing.length}):`);
  for (const m of missing) console.error(`  ${m}`);
  process.exitCode = 1;
}

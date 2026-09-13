#!/usr/bin/env node
/**
 * Copy the page imagery in from the IFS Coatings US site's library.
 *
 * The Mexican site has almost no photography of its own - one bare photo band
 * per page at best, and nothing at all on eight pages - so the templates source
 * their hero and supporting images from the US repo (cfg.imageSource), mapped
 * page by page in cfg.pageImages. Images are resized to a sensible web cap on
 * the way in: the originals are up to 3000×4500 and 1.9MB.
 *
 *   node scripts/import-images.mjs --dry-run
 */
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { execFileSync } from "node:child_process";
import cfg from "./site.config.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, `public/uploads/${cfg.imageDir}`);
const DRY = process.argv.includes("--dry-run");

// Long-edge cap per role. A hero is full-bleed and sits under a scrim, so it
// can afford less resolution than its size suggests; a supporting shot renders
// in a panel column about 600px wide and needs far less again. The originals
// run to 3000×4500 and 1.9MB.
const CAP = { hero: 1800, support: 1200 };
const QUALITY = "70";

if (!existsSync(cfg.imageSource)) {
  console.error(`source not found: ${cfg.imageSource}`);
  process.exit(1);
}

if (!DRY) mkdirSync(OUT, { recursive: true });

let copied = 0;
let bytes = 0;
const missing = [];

for (const [slug, images] of Object.entries(cfg.pageImages)) {
  for (const [role, rel] of Object.entries(images)) {
    if (!rel) continue;
    const src = join(cfg.imageSource, rel);
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
      execFileSync("sips", ["-Z", String(CAP[role] ?? 1800), dest], { stdio: "ignore" });
      if (/\.jpe?g$/i.test(dest)) {
        execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", QUALITY, dest], { stdio: "ignore" });
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

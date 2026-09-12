#!/usr/bin/env node
/**
 * Cap published images at twice the size they are actually displayed at.
 *
 * The RAL swatches are 1181x1181 PNGs (the "600x600" in the filename is a lie)
 * rendered at 219px - roughly 29x the pixels needed, and 48MB of a repo that
 * commits public/. Resizing to a 2x retina cap is invisible on screen.
 *
 * Runs against public/uploads only; wp-cache keeps the originals untouched, so
 * this is reversible by re-running prune-uploads.
 *
 *   node scripts/optimize-images.mjs --dry-run
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const DIR = join(ROOT, "public/uploads");
const DRY = process.argv.includes("--dry-run");

/** Max pixel width, by what the image is used for. */
const cap = (file) => {
  const name = basename(file);
  if (/^RAL-/i.test(name)) return 440; // colour swatch, displayed at 219px
  if (/^cropped-favicon/i.test(name)) return null; // icons are already sized
  return 1920; // heroes and photographs, displayed full-bleed at most
};

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/**
 * Some uploads are WebP saved with a .png extension (the old site optimised
 * part of the swatch set and kept the filenames). sips cannot write WebP, and
 * those files are already small, so they are left alone.
 */
const realFormat = (f) => {
  const out = execFileSync("file", ["-b", f], { encoding: "utf8" });
  if (/^PNG image data/.test(out)) return "png";
  if (/^JPEG image data/.test(out)) return "jpeg";
  return null;
};

const dims = (f) => {
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", f], { encoding: "utf8" });
  return {
    w: Number(out.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0),
    h: Number(out.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0),
  };
};

if (!existsSync(DIR)) {
  console.error("public/uploads not found - run prune-uploads first.");
  process.exit(1);
}

let before = 0;
let after = 0;
let changed = 0;

for (const file of walk(DIR).filter((f) => /\.(png|jpe?g)$/i.test(f))) {
  const max = cap(file);
  const size = statSync(file).size;
  before += size;
  if (!max) {
    after += size;
    continue;
  }
  if (!realFormat(file)) {
    after += size;
    continue;
  }
  const { w } = dims(file);
  if (!w || w <= max) {
    after += size;
    continue;
  }
  if (!DRY) execFileSync("sips", ["-Z", String(max), file], { stdio: "ignore" });
  const now = DRY ? size : statSync(file).size;
  after += now;
  changed++;
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + "MB";
console.log(`images resized : ${changed}${DRY ? " (dry run)" : ""}`);
console.log(`image bytes    : ${mb(before)} -> ${mb(after)}`);

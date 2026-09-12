#!/usr/bin/env node
/**
 * Fail the build if a page references a file the build does not contain.
 *
 * A broken image on a migrated site is usually a path that was rewritten in
 * one place and not another. This checks every local src/href in the built
 * HTML against dist/, so that class of mistake cannot reach production.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

if (!existsSync(DIST)) {
  console.error("dist/ not found - run `astro build` first.");
  process.exit(1);
}

const html = walk(DIST).filter((f) => f.endsWith(".html"));
const missing = new Map();
let checked = 0;

for (const file of html) {
  const src = readFileSync(file, "utf8");
  const refs = [
    ...[...src.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/url\((?:&quot;|["'])?(\/[^)"'&]+)/g)].map((m) => m[1]),
  ];
  for (const ref of refs) {
    if (ref.startsWith("//")) continue;
    checked++;
    const target = join(DIST, decodeURIComponent(ref));
    const ok = existsSync(target) || existsSync(join(target, "index.html")) || existsSync(`${target}.html`);
    if (!ok) {
      if (!missing.has(ref)) missing.set(ref, new Set());
      missing.get(ref).add(relative(DIST, file));
    }
  }
}

console.log(`asset refs checked: ${checked} across ${html.length} pages`);
if (missing.size) {
  console.error(`\nMISSING (${missing.size}):`);
  for (const [ref, pages] of [...missing].slice(0, 40)) {
    console.error(`  ${ref}\n    referenced by: ${[...pages].slice(0, 3).join(", ")}`);
  }
  process.exit(1);
}
console.log("all referenced assets present");

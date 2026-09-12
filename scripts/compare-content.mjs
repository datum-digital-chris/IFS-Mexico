#!/usr/bin/env node
/**
 * Compare the rebuilt site against the WordPress original, page by page.
 *
 * The build proves pages render and check-assets proves files exist. Neither
 * proves the words survived - that is this (wp-migration M-VERIFY).
 *
 * Every sentence-sized run of text on an old page must appear on the matching
 * new page. Site chrome (text repeated on 3+ pages) is excluded, because the
 * header and footer were deliberately rebuilt rather than copied.
 *
 * Reads the cached originals, so it keeps working after the old host is gone.
 *
 *   node scripts/compare-content.mjs            # compare against dist/
 *   node scripts/compare-content.mjs --verbose  # list every missing run
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import cfg from "./site.config.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const P = (...p) => join(ROOT, ...p);
const VERBOSE = process.argv.includes("--verbose");

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", reg: "®", copy: "©", deg: "°", trade: "™" };

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);

/** Visible text of a document, as normalised runs. */
function runs(html) {
  const body = html
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    // Alpine/Oxygen serialise WordPress objects into x-init attributes. The
    // JSON contains ">" so it breaks tag stripping and leaks post metadata
    // into the comparison as if it were page copy.
    .replace(/\sx-(init|data)="[\s\S]*?"(?=[\s>])/gi, " ")
    .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|td|tr|section|a|figcaption|span)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decode(body)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 12); // sentence-sized, not stray words
}

/**
 * Text that is deliberately absent from the new site. Every entry needs a
 * reason: this list is how an accepted difference stays distinguishable from
 * content that was lost by accident. Documented in docs/deviations.md.
 */
const EXPECTED = [
  // The Formidable honeypot label. The rebuilt Netlify form has the same
  // protection with a Spanish label ("Si es humano, deje este campo en blanco").
  "if you are human leave this field blank",
  // A wpDataTables shortcode for a plugin that is not installed. The old site
  // prints the literal "[wpdatatable id=2]" on the page; reproducing that would
  // be reproducing a visible fault.
  "wpdatatable id=2",
  // The fluoropolymer product is IFS 500FP, and the old copy writes it as
  // "IFS 500P" here. Corrected by cfg.textCorrections, so this sentence now
  // reads 500FP and no longer matches the original run.
  "más información sobre ifs 500p aquí",
];

const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();

// Build the old-site corpus and work out what counts as chrome.
const oldPages = new Map();
const freq = new Map();
for (const file of readdirSync(P(cfg.cache.html))) {
  const slug = file.replace(/\.html$/, "");
  if (cfg.retireSlugs.includes(slug)) continue;
  const r = runs(readFileSync(P(cfg.cache.html, file), "utf8"));
  oldPages.set(slug, r);
  for (const u of new Set(r.map(norm))) freq.set(u, (freq.get(u) ?? 0) + 1);
}
const chrome = new Set([...freq.entries()].filter(([, n]) => n >= 3).map(([t]) => t));

// Where each old slug now lives in dist/.
const pageMeta = new Map(
  readdirSync(P(cfg.outDir))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const d = JSON.parse(readFileSync(P(cfg.outDir, f), "utf8"));
      return [f.replace(/\.json$/, ""), d.path];
    }),
);

let checked = 0;
let missingTotal = 0;
const rows = [];

for (const [slug, oldRuns] of oldPages) {
  const path = pageMeta.get(slug);
  if (!path) {
    rows.push({ slug, status: "NO PAGE", missing: oldRuns.length });
    continue;
  }
  const distFile = P("dist", path === "/" ? "index.html" : `${path.replace(/^\/|\/$/g, "")}/index.html`);
  if (!existsSync(distFile)) {
    rows.push({ slug, status: "NOT BUILT", missing: oldRuns.length });
    continue;
  }
  const newText = norm(runs(readFileSync(distFile, "utf8")).join(" \n "));
  const wanted = [...new Set(oldRuns.map(norm))].filter((t) => t && !chrome.has(t));
  const missing = wanted.filter((t) => !newText.includes(t) && !EXPECTED.some((e) => t.includes(norm(e))));
  checked += wanted.length;
  missingTotal += missing.length;
  rows.push({ slug, status: missing.length ? "MISSING" : "ok", missing: missing.length, total: wanted.length, detail: missing });
}

for (const r of rows.sort((a, b) => b.missing - a.missing)) {
  if (r.status === "ok") continue;
  console.log(`${r.status.padEnd(10)} ${r.slug.padEnd(48)} ${r.missing}/${r.total ?? "?"} runs missing`);
  if (VERBOSE && r.detail) for (const d of r.detail.slice(0, 15)) console.log(`             - ${d.slice(0, 110)}`);
}

console.log(`\npages compared : ${oldPages.size}`);
console.log(`text runs      : ${checked} checked (chrome excluded: ${chrome.size})`);
console.log(`missing        : ${missingTotal}`);
process.exitCode = missingTotal ? 1 : 0;

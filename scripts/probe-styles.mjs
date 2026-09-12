#!/usr/bin/env node
/**
 * Record the old site's computed style for every Oxygen element at desktop
 * width, as ground truth for the extractor's base values.
 *
 * Why this exists: Oxygen's ID rules are desktop-first overrides. A property
 * set only inside `@media (max-width:767px)` has no value in the element's own
 * base rule - the wide value comes from somewhere else entirely (a tag rule
 * like `h2{font-size:24px}`, an inherited `text-align`, a component class).
 * Rebuilding mobile-first therefore needs a value to restore at the wide
 * breakpoint, and re-implementing the whole CSS cascade to find it is far more
 * fragile than asking the browser what it actually computed.
 *
 * Writes docs/oxygen-computed.json. Re-run only when the old site changes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import cfg from "./site.config.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/Chris/GitHub/MandaBeeching/node_modules/playwright");

const ROOT = new URL("..", import.meta.url).pathname;
const P = (...p) => join(ROOT, ...p);

/** Only the properties the compiler knows how to emit. */
const PROPS = [
  "color", "background-color", "font-size", "font-weight", "font-family", "font-style",
  "text-align", "text-transform", "text-decoration-line", "line-height", "letter-spacing",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "width", "height", "min-height", "max-width", "min-width",
  "display", "flex-direction", "flex-wrap", "align-items", "justify-content", "gap",
  "border-radius", "box-shadow", "opacity", "overflow", "position", "z-index",
];

const pages = JSON.parse(readFileSync(P("docs/wp-pages.json"), "utf8"));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

const computed = {};
for (const p of pages) {
  const path = new URL(p.link).pathname;
  try {
    await page.goto(cfg.siteUrl + path, { waitUntil: "networkidle", timeout: 45000 });
  } catch {
    console.warn(`skip ${path}`);
    continue;
  }
  const data = await page.evaluate((props) => {
    const out = {};
    for (const el of document.querySelectorAll("[id]")) {
      if (!/^[a-z_]+-\d+-\d+$/i.test(el.id)) continue;
      const cs = getComputedStyle(el);
      const rec = {};
      for (const prop of props) rec[prop] = cs.getPropertyValue(prop);
      out[el.id] = rec;
    }
    return out;
  }, PROPS);
  Object.assign(computed, data);
  process.stdout.write(".");
}

await browser.close();
writeFileSync(P("docs/oxygen-computed.json"), JSON.stringify(computed, null, 1));
console.log(`\nelements probed: ${Object.keys(computed).length}`);

#!/usr/bin/env node
/**
 * Parse the cached Oxygen stylesheets into a per-element style map.
 *
 * Oxygen writes ID-based CSS (`#headline-139-47{font-size:38px}`), so the old
 * site's design is not expressed in any token set - it is 3,000 one-off
 * declarations. Rebuilding in Tailwind means reading those declarations and
 * finding the repeated values, which become the theme.
 *
 * Emits:
 *   docs/oxygen-styles.json  elementId -> { base, "max-991", ... } -> {prop: value}
 *   docs/design-tokens.md    the value census, most-used first
 *
 * Re-runnable. Reads only wp-cache/; writes only docs/.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CSSDIR = join(ROOT, "wp-cache/css");

// Oxygen's own per-page sheets only. Plugin CSS (Formidable, TablePress) is
// deliberately excluded: those are vendor defaults, not the site's design.
const pageSheets = readdirSync(CSSDIR).filter((f) => /^css_(\d+|universal)\.css$/.test(f));

/**
 * Split a stylesheet into {media, selector, decls} triples.
 *
 * Brace-matching rather than regex: a regex for `@media ... { ... }` silently
 * fails on blocks it does not anticipate, and the rules inside then fall
 * through into the base layer as if they applied at every width. That is how
 * an Internet Explorer hack (`@media screen and (-ms-high-contrast: ...)`)
 * ended up constraining every heading on the site.
 */
function parse(css) {
  const out = [];

  const walk = (text, media) => {
    let i = 0;
    while (i < text.length) {
      // Skip comments and whitespace.
      if (text.startsWith("/*", i)) {
        const end = text.indexOf("*/", i + 2);
        i = end === -1 ? text.length : end + 2;
        continue;
      }
      const brace = text.indexOf("{", i);
      if (brace === -1) break;

      const prelude = text.slice(i, brace).trim();

      // Find the matching close brace for this block.
      let depth = 1;
      let j = brace + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const body = text.slice(brace + 1, j - 1);

      if (prelude.startsWith("@")) {
        const at = prelude.slice(1).split(/\s/)[0].toLowerCase();
        if (at === "media" || at === "supports") {
          // Nested conditions compose; only @media contributes a bucket.
          const cond = prelude.slice(at.length + 1).trim();
          walk(body, at === "media" ? [media, cond].filter(Boolean).join(" and ") : media);
        }
        // @font-face, @keyframes, @charset etc. carry no element styling here.
      } else if (prelude) {
        const decls = {};
        for (const d of body.split(";")) {
          const c = d.indexOf(":");
          if (c < 0) continue;
          const prop = d.slice(0, c).trim();
          if (!prop || prop.startsWith("/*")) continue;
          decls[prop] = d.slice(c + 1).trim();
        }
        if (Object.keys(decls).length) out.push({ media, selector: prelude, decls });
      }

      i = j;
    }
  };

  walk(css, "");
  return out;
}

/** "max-width:991px" -> "max-991"; anything else keeps its raw condition. */
const bucket = (cond) => {
  const m = cond.match(/max-width\s*:\s*(\d+)px/);
  return m ? `max-${m[1]}` : cond || "base";
};

const styles = {}; // elementId -> bucket -> {prop: value}
const orders = {}; // elementId -> bucket -> {prop: source position}
const bySelector = {}; // non-id selectors, kept for the shared/chrome classes
// Source position of every declaration. Two media queries can both match a
// viewport (e.g. max-767 and max-991 at 390px); CSS then resolves them by
// source order, not by which is narrower. Without this the wrong one wins.
let seq = 0;
const census = { color: {}, "font-size": {}, "font-family": {}, "font-weight": {}, spacing: {}, "background-color": {} };

for (const file of pageSheets) {
  const css = readFileSync(join(CSSDIR, file), "utf8");
  for (const { media, selector, decls } of parse(css)) {
    const b = bucket(media);
    // An Oxygen element rule is `#id`, `#id:hover`, `#id > .ct-...` etc.
    const idm = selector.match(/^#([a-z_]+-\d+-\d+)(.*)$/i);
    const key = idm ? idm[1] + (idm[2].trim() ? ` ${idm[2].trim()}` : "") : null;
    const target = key ? (styles[key] ??= {}) : (bySelector[selector] ??= {});
    Object.assign((target[b] ??= {}), decls);
    if (key) {
      const ot = ((orders[key] ??= {})[b] ??= {});
      for (const prop of Object.keys(decls)) ot[prop] = seq++;
    } else {
      seq += Object.keys(decls).length;
    }

    for (const [prop, val] of Object.entries(decls)) {
      if (prop === "color" || prop === "background-color") census[prop][val] = (census[prop][val] ?? 0) + 1;
      else if (prop === "font-size") census["font-size"][val] = (census["font-size"][val] ?? 0) + 1;
      else if (prop === "font-family") census["font-family"][val] = (census["font-family"][val] ?? 0) + 1;
      else if (prop === "font-weight") census["font-weight"][val] = (census["font-weight"][val] ?? 0) + 1;
      else if (/^(margin|padding)(-|$)/.test(prop)) census.spacing[val] = (census.spacing[val] ?? 0) + 1;
    }
  }
}

writeFileSync(
  join(ROOT, "docs/oxygen-styles.json"),
  JSON.stringify({ elements: styles, selectors: bySelector, orders }, null, 2),
);

const table = (obj, limit = 30) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([v, n]) => `| \`${v}\` | ${n} |`)
    .join("\n");

writeFileSync(
  join(ROOT, "docs/design-tokens.md"),
  `# Design tokens, mined from the Oxygen CSS

Generated by \`scripts/analyze-oxygen-css.mjs\` from the cached stylesheets.
Oxygen has no token layer - these are the raw declared values across
${pageSheets.length} sheets, ranked by how often they appear. The recurring ones
become the Tailwind theme; the long tail is one-off drift to normalise.

## Colour (text)

| value | uses |
|---|---|
${table(census.color)}

## Background colour

| value | uses |
|---|---|
${table(census["background-color"])}

## Font size

| value | uses |
|---|---|
${table(census["font-size"])}

## Font family

| value | uses |
|---|---|
${table(census["font-family"])}

## Font weight

| value | uses |
|---|---|
${table(census["font-weight"])}

## Spacing (margin / padding)

| value | uses |
|---|---|
${table(census.spacing, 40)}
`,
);

console.log(`sheets parsed   : ${pageSheets.length}`);
console.log(`styled elements : ${Object.keys(styles).length}`);
console.log(`shared selectors: ${Object.keys(bySelector).length}`);
console.log(`distinct colours: ${Object.keys(census.color).length} text / ${Object.keys(census["background-color"]).length} background`);
console.log(`distinct sizes  : ${Object.keys(census["font-size"]).length} font-size, ${Object.keys(census.spacing).length} spacing`);

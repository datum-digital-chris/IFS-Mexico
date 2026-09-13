#!/usr/bin/env node
/**
 * Visual-fidelity gate: compare every Oxygen element's geometry and key
 * computed styles between the old site and the rebuild, on every page.
 *
 * "Looks exactly like the old one" is this migration's acceptance criterion,
 * and neither the build nor the text comparison can check it. Because the
 * rebuild keeps Oxygen's element ids, each element can be matched one-to-one
 * and measured.
 *
 * dist/ is served through request interception, so this never starts a server.
 *
 *   node scripts/verify-layout.mjs                 # all pages, both widths
 *   node scripts/verify-layout.mjs home contactenos
 *   node scripts/verify-layout.mjs --tolerance 4
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { createRequire } from "node:module";
import cfg from "./site.config.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/Chris/GitHub/MandaBeeching/node_modules/playwright");

const ROOT = new URL("..", import.meta.url).pathname;
const P = (...p) => join(ROOT, ...p);

const argv = process.argv.slice(2);
const tolIdx = argv.indexOf("--tolerance");
const TOL = tolIdx >= 0 ? Number(argv[tolIdx + 1]) : 2; // px
const slugsArg = argv.filter((a) => !a.startsWith("--") && a !== String(TOL));

/**
 * Differences that are deliberate. Each needs a reason, so an accepted change
 * stays distinguishable from drift. Documented in docs/deviations.md.
 */
const DEVIATIONS = [
  {
    // The old /colors/ page ships with no tab selected, so all three panels are
    // hidden and none of the 190 RAL swatches are visible until the visitor
    // guesses to click. The rebuild has no tabs at all: the swatches are one
    // grid over a search and a row of colour-family filters
    // (docs/deviations.md #13). Reproducing the fault would mean shipping a
    // colour page that shows no colours.
    //
    // Everything inside a tab panel is therefore expected to differ: in the old
    // page those elements have zero height. The set is read from the extracted
    // content rather than pattern-matched, so it stays correct if the page
    // changes.
    slug: "colors",
    match: (() => {
      // The tabs-contents wrapper is consumed into the tabs block, so it has no
      // counterpart element in the rebuild.
      const ids = new Set(["(header)", "_tabs_contents-151-51"]);
      const collect = (node) => {
        if (node?.id) ids.add(node.id);
        for (const c of node?.children ?? []) collect(c);
      };
      const walkTabs = (node) => {
        if (node?.kind === "tabs") {
          ids.add(node.id);
          for (const t of node.tabs ?? []) ids.add(t.id);
          for (const pn of node.panels ?? []) {
            ids.add(pn.id);
            for (const c of pn.children ?? []) collect(c);
          }
          // The section wrapping the tabs changes height with them.
          return true;
        }
        let hit = false;
        for (const c of node?.children ?? []) if (walkTabs(c)) hit = true;
        if (hit && node?.id) ids.add(node.id);
        return hit;
      };
      try {
        const page = JSON.parse(readFileSync(P("src/content/pages/colors.json"), "utf8"));
        for (const sec of page.sections) walkTabs(sec);
      } catch {
        /* page not extracted yet */
      }
      return (id) => ids.has(id);
    })(),
  },
  {
    // Contáctenos is now a purpose-built page rather than the generic document
    // template (docs/deviations.md #12): the reference site's contact layout,
    // with the form in a two-thirds column and the page's phone number, email
    // line and list beside it. It keeps every word and none of the Oxygen
    // wrappers, so no element on it has a counterpart to measure. The form
    // itself was already rebuilt as a Netlify Form (#4).
    slug: "contactenos",
    match: () => true,
  },
];

const WIDTHS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};

function resolveDist(pathname) {
  const p = decodeURIComponent(pathname);
  for (const c of [
    join(P("dist"), p),
    join(P("dist"), p, "index.html"),
    `${join(P("dist"), p)}.html`,
  ]) {
    if (existsSync(c)) {
      try {
        return { body: readFileSync(c), type: MIME[extname(c)] ?? "application/octet-stream" };
      } catch {
        /* directory */
      }
    }
  }
  return null;
}

/** Geometry + the computed styles that carry the design, keyed by Oxygen id. */
const PROBE = () => {
  const out = {};
  for (const el of document.querySelectorAll("[id]")) {
    const id = el.id;
    if (!/^[a-z_]+-\d+-\d+$/i.test(id)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[id] = {
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: cs.fontSize,
      fw: cs.fontWeight,
      color: cs.color,
      bg: cs.backgroundColor,
      align: cs.textAlign,
      display: cs.display,
    };
  }
  return out;
};

const pages = JSON.parse(readFileSync(P("docs/wp-pages.json"), "utf8"));
const slugs = slugsArg.length ? slugsArg : pages.map((p) => p.slug);
const bySlug = new Map(pages.map((p) => [p.slug, p]));

const browser = await chromium.launch();
const findings = [];
let compared = 0;
let matched = 0;

for (const { name, width, height } of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const newPage = await ctx.newPage();
  await newPage.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "new.local") return route.continue();
    const hit = resolveDist(url.pathname);
    return hit
      ? route.fulfill({ status: 200, contentType: hit.type, body: hit.body })
      : route.fulfill({ status: 404, body: "" });
  });
  const oldPage = await ctx.newPage();

  for (const slug of slugs) {
    const meta = bySlug.get(slug);
    if (!meta) continue;
    const oldPath = new URL(meta.link).pathname;
    const newPath = cfg.pathRewrites[oldPath] ?? oldPath;

    let o, n;
    try {
      await oldPage.goto(cfg.siteUrl + oldPath, { waitUntil: "networkidle", timeout: 45000 });
      await oldPage.waitForTimeout(400);
      o = await oldPage.evaluate(PROBE);
      await newPage.goto(`https://new.local${newPath}`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      await newPage.waitForTimeout(400);
      n = await newPage.evaluate(PROBE);
    } catch (err) {
      findings.push({
        slug,
        viewport: name,
        id: "-",
        field: "load",
        old: "",
        now: String(err.message).split("\n")[0],
      });
      continue;
    }

    // Chrome ids (template 6) are a deliberate rebuild, not a port.
    const ids = Object.keys(o).filter((id) => !cfg.chromeTemplateIds.includes(id.split("-").pop()));

    // The rebuilt header is not the same height as the old one, and that
    // difference would otherwise shift every y on the page and swamp the real
    // findings. Measure y from the top of the first content element instead,
    // and report the header offset once.
    const originOld = Math.min(...ids.map((id) => o[id].y));
    const originNew = Math.min(...ids.filter((id) => n[id]).map((id) => n[id].y));
    if (
      Number.isFinite(originOld) &&
      Number.isFinite(originNew) &&
      Math.abs(originOld - originNew) > TOL
    ) {
      findings.push({
        slug,
        viewport: name,
        id: "(header)",
        field: "offset",
        old: originOld,
        now: originNew,
      });
    }

    for (const id of ids) {
      const a = o[id];
      const b = n[id];
      compared++;
      // Check the deviation list before anything else: an element that is
      // deliberately absent must not be reported as missing.
      if (DEVIATIONS.some((d) => d.slug === slug && d.match(id))) {
        matched++;
        continue;
      }
      if (!b) {
        findings.push({
          slug,
          viewport: name,
          id,
          field: "missing",
          old: `${a.w}x${a.h}`,
          now: "absent",
        });
        continue;
      }
      let ok = true;
      for (const f of ["x", "y", "w", "h"]) {
        const av = f === "y" ? a.y - originOld : a[f];
        const bv = f === "y" ? b.y - originNew : b[f];
        if (Math.abs(av - bv) > TOL) {
          findings.push({ slug, viewport: name, id, field: f, old: av, now: bv });
          ok = false;
        }
      }
      const same = (f, v) => (f === "align" && v === "start" ? "left" : v);
      for (const f of ["fs", "color", "bg", "align"]) {
        if (same(f, a[f]) !== same(f, b[f])) {
          findings.push({ slug, viewport: name, id, field: f, old: a[f], now: b[f] });
          ok = false;
        }
      }
      if (ok) matched++;
    }
  }
  await ctx.close();
}
await browser.close();

// Group findings so one systemic cause reads as one line, not five hundred.
const byField = {};
for (const f of findings) (byField[f.field] ??= []).push(f);

mkdirSync(P("docs"), { recursive: true });
const rows = findings.map(
  (f) => `${f.slug},${f.viewport},${f.id},${f.field},"${f.old}","${f.now}"`,
);
writeFileSync(
  P("docs/layout-diff.csv"),
  ["page,viewport,element,field,old,new", ...rows].join("\n") + "\n",
);

console.log(`elements compared : ${compared}`);
console.log(
  `matching          : ${matched} (${((100 * matched) / Math.max(compared, 1)).toFixed(1)}%)`,
);
console.log(`findings          : ${findings.length}`);
for (const [field, list] of Object.entries(byField).sort((a, b) => b[1].length - a[1].length)) {
  const pagesHit = new Set(list.map((f) => f.slug)).size;
  console.log(
    `  ${field.padEnd(8)} ${String(list.length).padStart(5)}  across ${pagesHit} pages   e.g. ${list[0].id} ${list[0].old} -> ${list[0].now}`,
  );
}
console.log(`\nfull list: docs/layout-diff.csv`);
process.exitCode = findings.length ? 1 : 0;

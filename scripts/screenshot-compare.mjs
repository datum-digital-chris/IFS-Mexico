#!/usr/bin/env node
/**
 * Screenshot the old site and the rebuilt one side by side.
 *
 * "Looks exactly like the old one" is the acceptance criterion for this
 * migration, and no text comparison can check it. This renders both at the
 * same widths and writes the pairs to docs/visual/ for review.
 *
 * dist/ is served through request interception rather than a local server, so
 * this never starts or stops a dev server.
 *
 *   node scripts/screenshot-compare.mjs [slug ...]
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/Chris/GitHub/MandaBeeching/node_modules/playwright");

const ROOT = new URL("..", import.meta.url).pathname;
const P = (...p) => join(ROOT, ...p);
const OUT = P("docs/visual");
const OLD = "https://ifscoatings.mx";

const WIDTHS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json", ".pdf": "application/pdf", ".woff2": "font/woff2" };

/** Map a request path onto a file in dist/. */
function resolveDist(pathname) {
  const p = decodeURIComponent(pathname);
  for (const c of [join(P("dist"), p), join(P("dist"), p, "index.html"), `${join(P("dist"), p)}.html`]) {
    if (existsSync(c) && !c.endsWith("/")) {
      try {
        return { body: readFileSync(c), type: MIME[extname(c)] ?? "application/octet-stream" };
      } catch {
        /* directory */
      }
    }
  }
  return null;
}

const pages = JSON.parse(readFileSync(P("docs/wp-pages.json"), "utf8"));
const bySlug = new Map(pages.map((p) => [p.slug, p]));
const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const slugs = wanted.length ? wanted : ["home", "conocenos", "polvo-epoxi", "mercado-arquitectonico", "contactenos", "descargar-informacion"];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];

for (const { name, width, height } of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });

  // New site: everything served from dist/.
  const newPage = await ctx.newPage();
  await newPage.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "new.local") return route.continue();
    const hit = resolveDist(url.pathname);
    if (!hit) return route.fulfill({ status: 404, body: "not found" });
    return route.fulfill({ status: 200, contentType: hit.type, body: hit.body });
  });

  const oldPage = await ctx.newPage();

  for (const slug of slugs) {
    const meta = bySlug.get(slug);
    const oldPath = meta ? new URL(meta.link).pathname : `/${slug}/`;
    const newPath = oldPath === "/trailers-2/" ? "/trailers/" : oldPath;

    for (const [label, page, url] of [
      ["old", oldPage, OLD + oldPath],
      ["new", newPage, `https://new.local${newPath}`],
    ]) {
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
        // Lazy-loaded images below the fold never load for a full-page
        // screenshot, so the capture shows blanks that are not on the real
        // page. Force them eager, then scroll, then let the network settle.
        await page.evaluate(() => {
          for (const img of document.querySelectorAll("img[loading]")) img.loading = "eager";
        });
        await page.evaluate(async () => {
          const step = window.innerHeight;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 120));
          }
          window.scrollTo(0, 0);
        });
        // Forcing `loading` to eager starts the fetches; they still have to
        // finish and decode before the capture, or the tiles photograph blank.
        await page.waitForLoadState("networkidle").catch(() => {});
        await page
          .waitForFunction(() => [...document.images].every((i) => i.complete), { timeout: 20000 })
          .catch(() => {});
        await page.waitForTimeout(600);
        await page.screenshot({ path: join(OUT, `${slug}-${name}-${label}.png`), fullPage: true });
      } catch (err) {
        results.push(`${slug} ${name} ${label}: FAILED ${err.message.split("\n")[0]}`);
      }
    }

    // Record the rendered height of each, a cheap proxy for layout drift.
    const h = {};
    for (const [label, page] of [["old", oldPage], ["new", newPage]]) {
      h[label] = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
    }
    const delta = h.old ? Math.round((100 * (h.new - h.old)) / h.old) : 0;
    results.push(`${slug.padEnd(36)} ${name.padEnd(8)} old ${String(h.old).padStart(6)}px  new ${String(h.new).padStart(6)}px  ${delta > 0 ? "+" : ""}${delta}%`);
    console.log(results.at(-1));
  }
  await ctx.close();
}

await browser.close();
writeFileSync(join(OUT, "heights.txt"), results.join("\n") + "\n");
console.log(`\nscreenshots in ${OUT}`);

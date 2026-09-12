// Phase 1 inventory (wp-migration M-INVENTORY-FIRST).
// Reads the cached corpus in wp-cache/ and emits docs/url-ledger.csv,
// docs/asset-census.csv and a census summary on stdout. Re-runnable.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CACHE = join(ROOT, "wp-cache/html");
const SITE = "https://ifscoatings.mx";

const pages = JSON.parse(readFileSync(join(ROOT, "docs/wp-pages.json"), "utf8"));
const bySlug = new Map(pages.map((p) => [p.slug, p]));

const strip = (h) =>
  h
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Oxygen wraps rendered page content in #inner_content; fall back to <body>.
const innerContent = (h) => {
  const i = h.indexOf('id="inner_content"');
  if (i === -1) return h.slice(h.indexOf("<body"));
  return h.slice(i);
};

const rows = [];
const assets = new Map(); // url -> Set(pages)

for (const file of readdirSync(CACHE).sort()) {
  const slug = file.replace(/\.html$/, "");
  const html = readFileSync(join(CACHE, file), "utf8");
  const meta = bySlug.get(slug);
  const body = innerContent(html);

  const title = (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").replace(/ - IFS Coatings Mexico$/, "");
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "");
  const robots = (html.match(/<meta name='robots' content='([^']+)'/)?.[1] ?? "");
  const words = strip(body).split(/\s+/).filter(Boolean).length;

  const imgs = [...body.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
  // Oxygen also paints images through per-page CSS background-image rules.
  // Oxygen paints most heroes through background-image in the per-page CSS, so
  // scanning the HTML alone misses them. Accept any host: the old site serves
  // some uploads from a CDN alias (M-URL-REWRITE-INTERNAL - sibling hosts are
  // internal). Everything is normalised to a /wp-content/uploads/... path.
  const cssIds = [...html.matchAll(/uploads\/oxygen\/css\/([a-z0-9]+)\.css/gi)].map((m) => m[1]);
  const cssText = cssIds
    .map((id) => {
      try {
        return readFileSync(join(ROOT, `wp-cache/css/css_${id}.css`), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");

  for (const m of [...(html + cssText).matchAll(/(?:https?:)?\/\/[a-zA-Z0-9.-]+(\/wp-content\/uploads\/[^\s"')]+)/gi)]) {
    const u = m[1].split(/[?#]/)[0];
    // Oxygen's generated stylesheets live under uploads/ but are not media;
    // they are cached separately in wp-cache/css/ and ported as CSS.
    if (u.startsWith("/wp-content/uploads/oxygen/")) continue;
    if (!assets.has(u)) assets.set(u, new Set());
    assets.get(u).add(slug);
  }

  // Oxygen element ids carry the post id that owns the template that rendered them.
  const owners = new Set([...html.matchAll(/id="[a-z_]+-\d+-(\d+)"/gi)].map((m) => m[1]));

  rows.push({
    path: meta ? new URL(meta.link).pathname : `/${slug}/`,
    wpId: meta?.id ?? "",
    slug,
    title,
    words,
    images: new Set(imgs).size,
    forms: (body.match(/frm_forms|<form/gi) ?? []).length ? "yes" : "",
    tables: (body.match(/tablepress/gi) ?? []).length ? "yes" : "",
    owners: [...owners].sort((a, b) => a - b).join(" "),
    indexed: robots.includes("noindex") ? "no" : "yes",
    canonical: canonical.replace(SITE, "") || "",
    disposition: "",
    target: "",
    reason: "",
  });
}

// Dispositions: everything keeps its URL except the stray WP sample post.
for (const r of rows) {
  if (r.slug === "hello-world") {
    Object.assign(r, { disposition: "retire", target: "/", reason: "WordPress default sample post, not linked from the site" });
  } else if (r.slug === "trailers-2") {
    Object.assign(r, { disposition: "move", target: "/trailers/", reason: "WP duplicate-slug suffix; clean slug on the new site" });
  } else if (r.slug === "home") {
    Object.assign(r, { disposition: "keep", target: "/", reason: "home page" });
  } else {
    Object.assign(r, { disposition: "keep", target: r.path, reason: "same URL on the new site" });
  }
}

const cols = ["path","wpId","slug","title","words","images","forms","tables","owners","indexed","canonical","disposition","target","reason"];
const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync(join(ROOT, "docs/url-ledger.csv"), [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n");

const docExt = /\.(pdf|docx?|xlsx?|pptx?|zip)$/i;
const aRows = [...assets.entries()].map(([url, on]) => ({
  url,
  kind: docExt.test(url.split("?")[0]) ? "document" : "media",
  usedOn: [...on].sort().join(" "),
}));
writeFileSync(join(ROOT, "docs/asset-census.csv"), ["url,kind,usedOn", ...aRows.map((r) => [esc(r.url), r.kind, esc(r.usedOn)].join(","))].join("\n") + "\n");

const sparse = rows.filter((r) => r.words < 100);
console.log(`pages in corpus : ${rows.length}`);
console.log(`total words     : ${rows.reduce((n, r) => n + r.words, 0)}`);
console.log(`media files     : ${aRows.filter((r) => r.kind === "media").length}`);
console.log(`documents       : ${aRows.filter((r) => r.kind === "document").length}`);
console.log(`pages with form : ${rows.filter((r) => r.forms).length}`);
console.log(`pages w/ table  : ${rows.filter((r) => r.tables).length}`);
console.log(`sparse (<100w)  : ${sparse.length}${sparse.length ? " -> " + sparse.map((r) => r.slug).join(", ") : ""}`);

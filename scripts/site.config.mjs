// Per-site settings for the migration scripts. This is the one file to change
// when pointing the tooling at a different WordPress/Oxygen site.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The site container width, taken from `--spacing-container` in the theme.
 * The stylesheet owns the value; this reads it so the two cannot drift.
 */
function readContainerWidth() {
  const file = join(new URL("..", import.meta.url).pathname, "src/styles/theme.css");
  const css = readFileSync(file, "utf8");
  const match = css.match(/--spacing-container:\s*([^;]+);/);
  if (!match) {
    throw new Error(`--spacing-container not found in ${file}; the container width has no source of truth.`);
  }
  return match[1].trim();
}

export default {
  siteUrl: "https://ifscoatings.mx",

  // Hosts that are internal to this site. The old install served some uploads
  // through a CDN alias, and links to either host must become relative
  // (wp-migration M-URL-REWRITE-INTERNAL).
  internalHosts: ["ifscoatings.mx", "www.ifscoatings.mx", "ifsmexico.us11.cdn-alpha.com"],

  // Oxygen reusable templates, not pages. Elements they render carry these
  // post ids, so anything ending -6 is header/footer chrome, not page content.
  chromeTemplateIds: ["6"],

  // Where the cached copy of the old site lives (see README).
  cache: { html: "wp-cache/html", css: "wp-cache/css", uploads: "wp-cache/uploads" },

  outDir: "src/content/pages",
  mediaOut: "public/uploads",

  // The WP default sample post, never linked from the site. Retired, not migrated.
  retireSlugs: ["hello-world"],

  // The seven market ("Mercados") pages. They share one template
  // (src/layouts/MarketLayout.astro) and take their imagery from the IFS
  // Coatings US site's library, which has proper market photography where the
  // Mexican site had none: every market page carried a single bare photo band
  // and zero images in the body.
  //
  // `from` is relative to the IFS-Coatings repo's public/ directory; run
  // `npm run import-images` to copy them in.
  marketsSource: "/Users/Chris/GitHub/IFS-Coatings/public",
  markets: {
    "mercado-arquitectonico": {
      hero: "architectural-coatings-hero.jpg",
      // A real building rather than the marketing collage in
      // performance-coatings-for-every-facade-*.jpg.
      support: "uploads/brooklyn-tower-9-dekalb-hero.jpg",
    },
    "aplicaciones-industriales-generales": {
      hero: "general-industrial-hero.jpg",
      support: "uploads/hardware-hero-01.jpg",
    },
    electrodomesticos: {
      hero: "uploads/appliances-hero-02.jpg",
      support: null,
    },
    "repintado-de-automoviles": {
      hero: "uploads/automotive-powder-hero-01.jpg",
      support: null,
    },
    maquiladores: {
      hero: "uploads/custom-coaters-hero-02.jpg",
      support: "uploads/custom-coaters-hero.jpg",
    },
    "trailers-2": {
      hero: "uploads/trailers-hero-02.jpg",
      support: null,
    },
    "varillas-de-refuerzo": {
      // rebar-lr-1200.jpg is the same dimensions at 1.9MB and will not
      // re-compress; this one is the better-encoded version of the same shot.
      hero: "uploads/rebars-toughest-coating-yet.jpg",
      support: "uploads/top-5-questions-for-rebar-industry.jpg",
    },
  },

  // Site container width, read from the stylesheet so there is exactly one
  // source of truth.
  //
  // Oxygen compiles its own `max-width: 1120px` onto every section inner wrap,
  // so the extractor has to rewrite that value as well — widening only the CSS
  // token leaves the masthead overhanging every extracted page by 40px a side.
  // Holding the number in two files meant a change to one silently broke the
  // alignment of 22 pages, so it is derived instead.
  containerWidth: readContainerWidth(),
  oxygenContainerWidth: "1120px",

  // Corrections applied to extracted copy. Each needs evidence, because this
  // rewrites the client's own words — it is for demonstrable errors only, not
  // for editing.
  textCorrections: [
    {
      // The fluoropolymer product is IFS 500FP. Its own page on this site says
      // 500FP four times and 500P once; the architectural page says 500P once
      // and 500FP never; the US site says 500FP 38 times. The short form is a
      // typo, and it is the code a specifier writes into a construction
      // document, so it matters.
      from: /\bIFS 500P\b/g,
      to: "IFS 500FP",
      reason: "product code typo: the product is IFS 500FP",
    },
  ],

  // WordPress shortcodes whose plugin is not installed, mapped to a table
  // authored in src/content/tables/. The old site printed the literal
  // shortcode text on the page; these render the real thing instead.
  shortcodeTables: {
    "wpdatatable id=2": "aama",
  },

  // Old -> new path rewrites. WordPress gave Tráilers a duplicate-slug suffix.
  pathRewrites: { "/trailers-2/": "/trailers/" },
};

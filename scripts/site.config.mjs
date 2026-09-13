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

  // Imagery, imported from the IFS Coatings US site's library.
  //
  // The Mexican site had almost none of its own: a market page carried one bare
  // photo band and no images in the body at all, and eight pages carried no
  // photograph whatsoever. The US repo has proper photography for all of it, so
  // each page here names the shot that belongs to it.
  //
  //   hero     overrides the page's own photo band, or supplies one where the
  //            page has none. Omit it and the extracted band is used.
  //   support  the photograph beside the opening passage in the overview panel.
  //            Omit it and that panel runs as a single capped column.
  //
  // Paths are relative to the IFS-Coatings repo's public/ directory; run
  // `npm run import-images` to copy them in. Choices are deliberate rather than
  // decorative - the supporting shot is the page's own subject wherever the
  // library has it, which is why Industriales gets the propane tanker its copy
  // names and Repintado gets a coated wheel.
  imageSource: "/Users/Chris/GitHub/IFS-Coatings/public",
  imageDir: "library",
  pageImages: {
    // ---- Mercados ----------------------------------------------------------
    "mercado-arquitectonico": {
      hero: "architectural-coatings-hero.jpg",
      // A real building rather than the marketing collage in
      // performance-coatings-for-every-facade-*.jpg.
      support: "uploads/brooklyn-tower-9-dekalb-hero.jpg",
    },
    "aplicaciones-industriales-generales": {
      hero: "general-industrial-hero.jpg",
      // "los tanques de propano" is the second thing the page's copy names.
      support: "uploads/52-foot-propane-tanks-zinc-rich-primer-top-coated-with-super-wet-white.jpg",
    },
    electrodomesticos: {
      hero: "uploads/appliances-hero-02.jpg",
      // A kitchen with a washing machine and an oven in it, which is the page.
      support: "uploads/hero-pureclad.jpg",
    },
    "repintado-de-automoviles": {
      hero: "uploads/automotive-powder-hero-01.jpg",
      // A coated wheel: "La protección de sus ruedas es importante".
      support: "uploads/hero-standard-polyester.jpg",
    },
    maquiladores: {
      hero: "uploads/custom-coaters-hero-02.jpg",
      support: "uploads/custom-coaters-hero.jpg",
    },
    "trailers-2": {
      hero: "uploads/trailers-hero-02.jpg",
      support: "uploads/with-hay-bales-website-1200.jpg",
    },
    "varillas-de-refuerzo": {
      // rebar-lr-1200.jpg is the same dimensions at 1.9MB and will not
      // re-compress; this one is the better-encoded version of the same shot.
      hero: "uploads/rebars-toughest-coating-yet.jpg",
      support: "uploads/top-5-questions-for-rebar-industry.jpg",
    },

    // ---- Tipos de Polvo ----------------------------------------------------
    // These keep their own photo bands; they only needed the supporting shot.
    "polvo-de-poliester-estandar": { support: "uploads/powder-manufacture-hero.jpg" },
    "polvos-de-poliester-superduraderos": { support: "uploads/understanding-weathering.jpg" },
    "polvo-de-fluoropolimero-feve": { support: "uploads/framing-the-view-header.jpg" },
    "polvo-epoxi": { support: "uploads/hardware-hero-01.jpg" },
    "polvo-hibrido": { support: "uploads/myth-busting-powder-is-not-just-polyester.jpg" },
    "polvo-antimicrobiano": { support: "uploads/ifs-advance-hero.jpg" },
    // The page is about anti-graffiti powder; this is a graffitied wall.
    "polvo-antigrafiti": { support: "uploads/ag-1200-website.jpg" },
    "imprimadores-en-polvo": { support: "uploads/polyurethane-powder-hero.jpg" },
    // NSF approval is for food-contact and food-service environments.
    "recubrimientos-en-polvo-aprobados-por-nsf": { support: "uploads/10-powder-applications-for-retailers.jpg" },
    "polvo-disipadores-de-electricidad-estatica-esd": { support: "uploads/ifs-specialities-hero.jpg" },
    "polvos-termoplasticos-ifs-puroplaz": { support: "uploads/puroplaz-powder-coating-delivers-durability.jpg" },
    // UL listings are mostly lighting and electrical enclosures. This page had
    // no photo band of its own, so it gets a hero as well.
    "ul-polvo": { hero: "uploads/ifs-powder-types-hero.jpg", support: "uploads/lighting-hero-05.jpg" },

    // ---- Más Allá del Metal ------------------------------------------------
    "ifs-pureclad": { support: "uploads/ifs-architectural-al-hero.jpg" },

    // ---- Colores -----------------------------------------------------------
    colors: { support: "uploads/color-trends-2026-chips.jpg" },

    // ---- Recursos ----------------------------------------------------------
    // All four of these opened on a flat dark header, having no photograph of
    // their own. The legal pages keep theirs: a photograph over the terms of
    // use would be decoration, and the reference site's legal pages carry none.
    conocenos: { hero: "uploads/about-us-hero.jpg", support: "uploads/ifs-manufacturing-facilities-hero.jpg" },
    "valores-de-la-mision": { hero: "uploads/join-the-team-hero.jpg" },
    "descargar-informacion": { hero: "downloads-hero.jpg" },
    "clave-de-codigo-de-producto": { hero: "uploads/product-codes-hero.jpg" },
    contactenos: { hero: "contact-hero.jpg" },
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

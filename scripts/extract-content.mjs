#!/usr/bin/env node
/**
 * Extract the cached Oxygen pages into structured content trees.
 *
 * Oxygen never puts builder output through `the_content`, so the REST API
 * returns empty bodies - the content only exists in the rendered front-end
 * HTML, which is why wp-cache/html is the source here (M-EXTRACT-*).
 *
 * Output is a build input, NOT source to edit (M-EXTRACT-GENERATED). Fix
 * rendering problems in the templates or in this script, never by hand-editing
 * src/content/pages/*.json - the next run overwrites them.
 *
 * Emits:
 *   src/content/pages/<slug>.json   the block tree, with compiled Tailwind classes
 *   docs/extract-report.md          unhandled CSS, shortcodes, external links
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { createWindow } from "@mixmark-io/domino";
import cfg from "./site.config.mjs";
import { elementToTw, COMPONENT_DEFAULTS } from "./lib/css-to-tw.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const P = (...p) => join(ROOT, ...p);

const styles = JSON.parse(readFileSync(P("docs/oxygen-styles.json"), "utf8"));
// The old site's computed styles at desktop width (scripts/probe-styles.mjs).
const computed = JSON.parse(readFileSync(P("docs/oxygen-computed.json"), "utf8"));
const wpPages = JSON.parse(readFileSync(P("docs/wp-pages.json"), "utf8"));
const metaBySlug = new Map(wpPages.map((p) => [p.slug, p]));

const report = { unhandledCss: {}, shortcodes: [], external: new Set(), missingMedia: new Set(), unknownTags: {} };

/** Absolute URL on one of our hosts -> site-relative path. */
const rewriteUrl = (raw) => {
  if (!raw) return raw;
  let u = raw.trim();
  if (u.startsWith("//")) u = `https:${u}`;
  try {
    const parsed = new URL(u, cfg.siteUrl);
    if (!cfg.internalHosts.includes(parsed.host)) {
      if (/^https?:$/.test(parsed.protocol)) report.external.add(parsed.href);
      return raw;
    }
    let path = parsed.pathname;
    if (path.startsWith("/wp-content/uploads/")) path = path.replace("/wp-content/uploads/", "/uploads/");
    for (const [from, to] of Object.entries(cfg.pathRewrites)) if (path === from) path = to;
    return path + parsed.search + parsed.hash;
  } catch {
    return raw;
  }
};

/**
 * Parse an Oxygen `background-image` value into local-asset layers.
 *
 * The value is a comma-separated layer list where a layer may itself contain
 * commas inside parentheses - `linear-gradient(rgba(23,45,86,.49),rgba(...))`
 * over `url(...)` is how the old site darkens its hero photographs. Splitting
 * on a naive comma, or matching a gradient with `\([^)]*\)`, truncates it at
 * the first `)` and produces a declaration the browser discards entirely,
 * which silently removes every hero image on the site.
 */
function splitLayers(value) {
  const layers = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      layers.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) layers.push(cur.trim());
  return layers;
}

const bgImage = (decl) => {
  if (!decl || decl === "none") return null;
  const layers = splitLayers(decl)
    .map((layer) =>
      layer.replace(/url\((['"]?)([^'")]+)\1\)/g, (_, _q, raw) => {
        const u = rewriteUrl(raw);
        if (u.startsWith("/uploads/")) {
          try {
            readFileSync(P(cfg.cache.uploads, u.replace("/uploads/", "")));
          } catch {
            report.missingMedia.add(u);
          }
        }
        return `url("${u}")`;
      }),
    )
    .filter(Boolean);
  return layers.length ? { layers } : null;
};

/**
 * Keep only real viewport buckets.
 *
 * universal.css carries an Internet Explorer 10/11 hack
 * (`@media screen and (-ms-high-contrast: ...)`) that sets `max-width:100%` on
 * every text element. It never applies in a modern browser, but merged into the
 * base it constrains headings and rich text on narrow screens. Anything that is
 * not `base` or a `max-<px>` tier is a targeted hack, not a breakpoint.
 */
const viewportOnly = (buckets) =>
  Object.fromEntries(Object.entries(buckets ?? {}).filter(([k]) => k === "base" || /^max-\d+$/.test(k)));

/**
 * Oxygen "classes" (reusable styles authored in the builder, e.g.
 * `.colorcard-div`, `.sticky-side`) are ordinary class rules, not ID rules, so
 * they are invisible to the per-element style map. They are indexed here by
 * class name and merged below the element's own ID rules.
 *
 * Selector groups are split so the `:not(.ct-section)` flex variant Oxygen
 * emits alongside each class contributes too.
 */
const classStyles = (() => {
  const index = {};
  for (const [selector, buckets] of Object.entries(styles.selectors)) {
    for (const part of selector.split(",")) {
      const t = part.replace(/\s+/g, " ").trim();
      // Only a rule that targets the element itself: `.foo` or `.foo:not(...)`.
      const m = t.match(/^\.([a-z][\w-]*)((?::not\([^)]*\))*)$/i);
      if (!m) continue;
      const name = m[1];
      if (/^(ct|oxy)-/.test(name)) continue; // component defaults, handled separately
      for (const [bucket, decls] of Object.entries(viewportOnly(buckets))) {
        const target = ((index[name] ??= {})[bucket] ??= {});
        Object.assign(target, decls);
      }
    }
  }
  return index;
})();

/**
 * Oxygen component-class defaults, read from the parsed stylesheets rather than
 * transcribed. `link_button` in particular carries its padding and colours in
 * `.ct-link-button`, and hardcoding a guess there makes every button on the
 * site the wrong size.
 */
const TYPE_CLASS = {
  section: "ct-section",
  div_block: "ct-div-block",
  new_columns: "ct-new-columns",
  headline: "ct-headline",
  text_block: "ct-text-block",
  link_button: "ct-link-button",
  link_text: "ct-link-text",
  link: "ct-link",
  image: "ct-image",
  code_block: "ct-code-block",
  shortcode: "ct-shortcode",
  nestable_shortcode: "ct-nestable-shortcode",
  _rich_text: "oxy-rich-text",
};

const componentDefaults = (() => {
  const out = {};
  for (const [selector, buckets] of Object.entries(styles.selectors)) {
    for (const part of selector.split(",")) {
      const t = part.replace(/\s+/g, " ").trim();
      const m = t.match(/^\.((?:ct|oxy)-[\w-]+)$/);
      if (!m) continue;
      const type = Object.keys(TYPE_CLASS).find((k) => TYPE_CLASS[k] === m[1]);
      if (!type) continue;
      for (const [bucket, decls] of Object.entries(viewportOnly(buckets))) {
        Object.assign((out[type] ??= {})[bucket] ??= {}, decls);
      }
    }
  }
  return out;
})();

/**
 * Defaults for the section inner wrap. It has no Oxygen id of its own, so its
 * base padding (75px block / 20px inline) and max-width live only in the
 * universal class rules. Without them a section that overrides the inline
 * padding at one breakpoint has nothing to restore at the wider ones.
 */
const wrapDefaults = (() => {
  const out = {};
  for (const [selector, buckets] of Object.entries(styles.selectors)) {
    for (const part of selector.split(",")) {
      const t = part.replace(/\s+/g, "").trim();
      if (t !== ".ct-section-inner-wrap" && t !== ".ct-section>.ct-section-inner-wrap") continue;
      for (const [bucket, decls] of Object.entries(viewportOnly(buckets))) Object.assign((out[bucket] ??= {}), decls);
    }
  }
  return out;
})();

/** Declarations Oxygen applies to a child because of its parent. */
const CONTEXTUAL = {
  // `.ct-new-columns > .ct-div-block { padding: 20px }` - the inset on every
  // column. Without it card text runs to the card edge.
  new_columns: {
    div_block: { "padding-top": "20px", "padding-right": "20px", "padding-bottom": "20px", "padding-left": "20px" },
  },
};

/** Merge bucket maps left-to-right, later winning. */
function mergeBuckets(...maps) {
  const out = {};
  for (const m of maps) {
    for (const [bucket, decls] of Object.entries(m ?? {})) Object.assign((out[bucket] ??= {}), decls);
  }
  return out;
}

const oxyType = (id) => id?.match(/^([a-z_]+)-\d+-\d+$/i)?.[1] ?? null;

/** Inline HTML of a rich-text/text block, with internal links rewritten. */
function innerHtml(el) {
  for (const a of el.querySelectorAll("a[href]")) a.setAttribute("href", rewriteUrl(a.getAttribute("href")));
  for (const img of el.querySelectorAll("img[src]")) {
    img.setAttribute("src", rewriteUrl(img.getAttribute("src")));
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    if (!img.getAttribute("alt")) img.setAttribute("alt", "");
    img.setAttribute("loading", "lazy");
  }
  return el.innerHTML.trim();
}

/** Compiled Tailwind classes for one Oxygen element id. */
function classesFor(id, classNames = "", parentType = null, parentId = null) {
  const type = oxyType(id);
  const own = styles.elements[id];
  const extra = {};
  // Oxygen writes the section's own padding onto its inner wrap.
  const wrap = styles.elements[`${id} > .ct-section-inner-wrap`];

  // Cascade, weakest first: the Oxygen component default, anything the parent
  // imposes on its children, any authored Oxygen class, then the element's own
  // ID rule, which always wins.
  const custom = classNames
    .split(/\s+/)
    .filter((c) => c && !/^(ct|oxy)-/.test(c))
    .map((c) => classStyles[c])
    .filter(Boolean);
  const contextual = parentType ? (CONTEXTUAL[parentType]?.[type] ?? null) : null;

  // Oxygen writes per-parent child rules as ID descendants, e.g.
  // `#new_columns-184-47 > .ct-div-block{width:100%!important}` below 992px -
  // this is how every column block stacks on mobile. They key off the parent's
  // id, so they are invisible when compiling the child on its own.
  const parentKeys = parentId
    ? classNames
        .split(/\s+/)
        .filter((c) => /^ct-/.test(c))
        .map((c) => `${parentId} > .${c}`)
        .filter((k) => styles.elements[k])
    : [];
  const fromParent = parentKeys.map((k) => viewportOnly(styles.elements[k]));

  // Source positions for the rules that can conflict within one viewport
  // range: the element's own rules and the parent-scoped child rules.
  const ruleOrders = mergeBuckets(...parentKeys.map((k) => styles.orders?.[k] ?? {}), styles.orders?.[id] ?? {});

  const buckets = mergeBuckets(
    componentDefaults[type] ?? {},
    contextual ? { base: contextual } : {},
    ...fromParent,
    ...custom,
    viewportOnly(own),
  );
  const defaults = COMPONENT_DEFAULTS[type] ?? {};
  // Not every element carries an ID rule - Oxygen only writes one when a
  // property was customised. The component-class defaults still apply, so they
  // must be compiled even when `buckets` is empty, or a `.ct-new-columns` with
  // no overrides loses `flex-direction: row` and stacks.
  if (!Object.keys(buckets).length && !wrap && !Object.keys(defaults).length) {
    return { className: "", wrapClassName: "", bg: null };
  }

  // A property overridden only inside a max-width bucket has no wide value in
  // the element's own rules, so a mobile-first rebuild has nothing to restore
  // at the wide breakpoint and the narrow value leaks upward. Seed the base
  // from what the old site actually computed at desktop width.
  const probe = computed[id];
  if (probe) {
    const narrow = new Set();
    for (const [bucket, decls] of Object.entries(buckets)) {
      if (bucket === "base") continue;
      for (const prop of Object.keys(decls)) narrow.add(prop);
    }
    buckets.base ??= {};
    for (const prop of narrow) {
      if (buckets.base[prop] !== undefined || defaults[prop] !== undefined) continue;
      const v = probe[prop];
      if (v !== undefined && v !== "" && v !== "auto" && v !== "normal" && v !== "none") buckets.base[prop] = v;
    }
  }

  const { className, unhandled } = elementToTw(buckets, defaults, ruleOrders);
  const wrapCompiled = type === "section" ? elementToTw(mergeBuckets(wrapDefaults, viewportOnly(wrap)), {}) : null;
  for (const [k, v] of Object.entries({ ...unhandled, ...(wrapCompiled?.unhandled ?? {}) })) {
    (report.unhandledCss[k] ??= new Set()).add(v);
  }
  const bgDecl = buckets.base?.["background-image"];
  return {
    className,
    wrapClassName: wrapCompiled?.className ?? "",
    bg: bgImage(bgDecl),
    bgSize: buckets?.base?.["background-size"] ?? null,
    bgPosition: buckets?.base?.["background-position"] ?? null,
    ...extra,
  };
}

/** Recursively convert an Oxygen element into a content node. */
function walk(el, parentType = null, parentId = null) {
  if (el.nodeType === 3) {
    const t = el.textContent.trim();
    return t ? { kind: "text", value: t } : null;
  }
  if (el.nodeType !== 1) return null;

  const tag = el.tagName.toLowerCase();
  // Oxygen inlines its tab/menu initialisers next to the content. Walking them
  // turns the script body into visible page text.
  if (tag === "script" || tag === "style" || tag === "noscript") return null;
  const id = el.getAttribute("id") ?? "";
  const cls = el.getAttribute("class") ?? "";
  const style = classesFor(id, cls, parentType, parentId);
  const selfType = oxyType(id);

  const kids = () => [...el.childNodes].map((n) => walk(n, selfType, id)).filter(Boolean);

  if (cls.includes("ct-section")) {
    const wrap = [...el.childNodes].find((n) => n.nodeType === 1 && (n.getAttribute?.("class") ?? "").includes("ct-section-inner-wrap")) ?? el;
    return { kind: "section", id, ...style, children: [...wrap.childNodes].map((n) => walk(n, selfType, id)).filter(Boolean) };
  }
  if (cls.includes("ct-new-columns")) return { kind: "columns", id, ...style, children: kids() };
  if (cls.includes("ct-div-block")) return { kind: "div", id, ...style, children: kids() };
  if (cls.includes("ct-headline")) {
    return { kind: "heading", id, level: /^h[1-6]$/.test(tag) ? Number(tag[1]) : 2, html: innerHtml(el), ...style };
  }
  if (cls.includes("ct-text-block") || cls.includes("oxy-rich-text")) {
    return { kind: "richtext", id, html: innerHtml(el), ...style };
  }
  if (cls.includes("ct-link-button")) {
    return { kind: "button", id, href: rewriteUrl(el.getAttribute("href")), label: el.textContent.trim(), ...style };
  }
  if (cls.includes("ct-link-text") || (cls.includes("ct-link") && tag === "a")) {
    const href = rewriteUrl(el.getAttribute("href"));
    // A link that wraps Oxygen elements (the footer logo, the phone number)
    // must keep walking, or those children are emitted as raw HTML and lose the
    // classes compiled from their own ID rules.
    const nested = [...el.childNodes].some((n) => n.nodeType === 1 && oxyType(n.getAttribute?.("id") ?? ""));
    if (nested) return { kind: "link", id, href, ...style, children: kids() };
    return { kind: "link", id, href, html: innerHtml(el), ...style };
  }
  if (tag === "img" || cls.includes("ct-image")) {
    const img = tag === "img" ? el : el.querySelector("img");
    if (!img) return null;
    const src = rewriteUrl(img.getAttribute("src"));
    if (src?.startsWith("/uploads/")) {
      try {
        readFileSync(P(cfg.cache.uploads, src.replace("/uploads/", "")));
      } catch {
        report.missingMedia.add(src);
      }
    }
    return {
      kind: "image",
      id,
      src,
      alt: img.getAttribute("alt") ?? "",
      width: img.getAttribute("width") ?? null,
      height: img.getAttribute("height") ?? null,
      ...style,
    };
  }
  // Oxygen tabs (the RAL colour groups). The tab strip and the panels are
  // siblings joined by a data attribute, so they are collected into one block
  // rather than walked as two unrelated containers - otherwise every panel
  // renders at once and the page becomes 13,000px tall.
  if (cls.includes("oxy-tabs-wrapper")) {
    const contentsId = el.getAttribute("data-oxy-tabs-contents-wrapper");
    const contents = contentsId ? el.ownerDocument.getElementById(contentsId) : null;
    const tabEls = [...el.childNodes].filter((n) => n.nodeType === 1 && (n.getAttribute("class") ?? "").includes("oxy-tab"));
    const panelEls = contents
      ? [...contents.childNodes].filter((n) => n.nodeType === 1 && (n.getAttribute("class") ?? "").includes("oxy-tab-content"))
      : [];
    return {
      kind: "tabs",
      id,
      ...style,
      tabs: tabEls.map((t) => {
        const tid = t.getAttribute("id") ?? "";
        // The label text sits in a nested Oxygen text block; keep its id and
        // classes so the rebuilt tab matches the original element for element.
        const inner = [...t.childNodes].find((n) => n.nodeType === 1 && oxyType(n.getAttribute?.("id") ?? ""));
        const innerId = inner?.getAttribute("id") ?? "";
        return {
          id: tid,
          label: t.textContent.trim(),
          className: classesFor(tid, t.getAttribute("class") ?? "", "tabs", id).className,
          innerId,
          innerClassName: innerId ? classesFor(innerId, inner.getAttribute("class") ?? "", "tab", tid).className : "",
        };
      }),
      panels: panelEls.map((pnl) => ({
        id: pnl.getAttribute("id") ?? "",
        children: [...pnl.childNodes].map((n) => walk(n, oxyType(pnl.getAttribute("id") ?? ""), pnl.getAttribute("id"))).filter(Boolean),
      })),
    };
  }

  // The panels are consumed by the tabs block above; skip the wrapper so they
  // are not emitted a second time as loose content.
  if (cls.includes("oxy-tabs-contents-wrapper")) return null;

  // Oxygen's in-page navigation (the product sidebar on 19 pages). Rendered as
  // a component rather than walked, so it keeps list semantics and can collapse
  // on narrow screens the way the original does.
  if (tag === "nav" && cls.includes("oxy-nav-menu")) {
    const list = el.querySelector("ul");
    const items = list
      ? [...list.childNodes]
          .filter((n) => n.nodeType === 1 && n.tagName.toLowerCase() === "li")
          .map((li) => {
            const a = [...li.childNodes].find((n) => n.nodeType === 1 && n.tagName.toLowerCase() === "a");
            return a
              ? {
                  label: a.textContent.trim(),
                  href: rewriteUrl(a.getAttribute("href")),
                  current: li.getAttribute("class")?.includes("current-menu-item") ?? false,
                }
              : null;
          })
          .filter(Boolean)
      : [];
    return { kind: "navmenu", id, items, ...style };
  }

  if (cls.includes("ct-code-block") || cls.includes("ct-shortcode") || cls.includes("ct-nestable-shortcode")) {
    const html = el.innerHTML.trim();
    // The Formidable contact form cannot come across to a static build; it is
    // rebuilt as a Netlify Form. Mark it so the renderer swaps in that
    // component rather than dropping the block.
    if (html.includes("frm_forms")) {
      // Formidable renders a title and an intro paragraph above the fields.
      // They are page copy, not form plumbing, so they survive the swap.
      const titleEl = el.querySelector(".frm_form_title");
      const descEl = el.querySelector(".frm_description");
      return {
        kind: "form",
        id,
        heading: titleEl?.textContent.trim() ?? "",
        intro: descEl ? innerHtml(descEl) : "",
        ...style,
      };
    }
    if (/\[[a-z_-]+/i.test(html)) report.shortcodes.push({ id, html: html.slice(0, 160) });
    return { kind: "html", id, html: innerHtml(el), ...style };
  }

  // Anything else: keep the children so no text is lost.
  const children = kids();
  if (!children.length) return null;
  if (!["div", "span", "section", "p", "ul", "ol", "li", "table", "tbody", "tr", "td", "th", "a", "figure"].includes(tag)) {
    (report.unknownTags[tag] ??= new Set()).add(id || cls.slice(0, 40));
  }
  return { kind: "group", id, tag, ...style, children };
}

mkdirSync(P(cfg.outDir), { recursive: true });
const results = [];

for (const file of readdirSync(P(cfg.cache.html)).sort()) {
  const slug = file.replace(/\.html$/, "");
  if (cfg.retireSlugs.includes(slug)) continue;

  const html = readFileSync(P(cfg.cache.html, file), "utf8");
  const doc = createWindow(html).document;
  const meta = metaBySlug.get(slug);
  const postId = String(meta?.id ?? "");

  // Page content = the Oxygen sections belonging to THIS post. Sections whose
  // ids end -6 come from the shared header/footer template and are chrome.
  const sections = [...doc.querySelectorAll(".ct-section")].filter((s) => {
    const owner = (s.getAttribute("id") ?? "").match(/-(\d+)$/)?.[1];
    return owner === postId;
  });

  const tree = sections.map(walk).filter(Boolean);

  const title = (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").replace(/ - IFS Coatings Mexico$/, "").trim();
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  const ogImage = rewriteUrl(html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? "");

  let path = meta ? new URL(meta.link).pathname : `/${slug}/`;
  for (const [from, to] of Object.entries(cfg.pathRewrites)) if (path === from) path = to;

  const out = {
    slug: slug === "home" ? "" : path.replace(/^\/|\/$/g, ""),
    wpId: meta?.id ?? null,
    path: slug === "home" ? "/" : path,
    title,
    description,
    ogImage: ogImage || null,
    sections: tree,
  };

  writeFileSync(P(cfg.outDir, `${slug}.json`), JSON.stringify(out, null, 2) + "\n");
  const words = JSON.stringify(tree).replace(/<[^>]+>/g, " ").split(/\s+/).length;
  results.push({ slug, sections: tree.length, words });
}

// ---- site chrome ------------------------------------------------------------
// The header, top bar and footer come from Oxygen template post 6, so they are
// identical on every page and are extracted once rather than per page.
{
  const doc = createWindow(readFileSync(P(cfg.cache.html, "home.html"), "utf8")).document;
  const byId = (id) => doc.getElementById(id);

  // domino's HTMLCollection is not iterable and it has no :scope support, so
  // direct children are found by walking childNodes.
  const childEls = (el, tag) =>
    [...el.childNodes].filter((n) => n.nodeType === 1 && (!tag || n.tagName.toLowerCase() === tag));

  /** The WordPress nav menu as a tree, with hrefs rewritten. */
  const menuTree = (ul) =>
    childEls(ul, "li")
      .map((li) => {
        const a = childEls(li, "a")[0];
        const sub = childEls(li, "ul")[0];
        return {
          label: (a?.textContent ?? "").trim(),
          href: a ? rewriteUrl(a.getAttribute("href")) : null,
          children: sub ? menuTree(sub) : [],
        };
      })
      .filter((i) => i.label);

  const menuEl = doc.querySelector("#menu-main");
  const logo = byId("image-142-6")?.querySelector?.("img") ?? byId("image-142-6");

  const site = {
    topBar: {
      links: ["link_text-148-6", "link_text-150-6"].map((id) => {
        const el = byId(id);
        return el ? { label: el.textContent.trim(), href: rewriteUrl(el.getAttribute("href")), ...classesFor(id) } : null;
      }).filter(Boolean),
      flag: (() => {
        const img = byId("image-152-6")?.tagName?.toLowerCase() === "img" ? byId("image-152-6") : byId("image-152-6")?.querySelector("img");
        return img ? { src: rewriteUrl(img.getAttribute("src")), alt: img.getAttribute("alt") ?? "" } : null;
      })(),
      phone: {
        label: byId("text_block-173-6")?.textContent.trim() ?? "",
        href: rewriteUrl(byId("link-171-6")?.getAttribute("href") ?? ""),
      },
    },
    logo: logo
      ? { src: rewriteUrl(logo.getAttribute("src")), alt: logo.getAttribute("alt") || "IFS Coatings Mexico", href: rewriteUrl(byId("link-189-6")?.getAttribute("href") ?? "/") }
      : null,
    menu: menuEl ? menuTree(menuEl) : [],
    footer: (() => {
      const sec = byId("section-82-6");
      return sec ? walk(sec) : null;
    })(),
  };

  writeFileSync(P("src/content/site.json"), JSON.stringify(site, null, 2) + "\n");
  console.log(`menu items    : ${site.menu.length} top level`);
}

// ---- report -----------------------------------------------------------------
const lines = ["# Extraction report", "", "Generated by `scripts/extract-content.mjs`. Re-run after any change.", ""];
lines.push("## Pages", "", "| slug | sections |", "|---|---|");
for (const r of results) lines.push(`| ${r.slug} | ${r.sections} |`);

lines.push("", "## CSS properties not compiled to Tailwind", "");
const uh = Object.entries(report.unhandledCss).sort((a, b) => b[1].size - a[1].size);
if (!uh.length) lines.push("None.");
else {
  lines.push("These Oxygen declarations have no utility mapping yet. Each is either", "irrelevant to the port or needs a rule in `scripts/lib/css-to-tw.mjs`.", "", "| property | distinct values | example |", "|---|---|---|");
  for (const [k, v] of uh) lines.push(`| \`${k}\` | ${v.size} | \`${[...v][0]?.slice(0, 60)}\` |`);
}

lines.push("", "## Shortcodes found in content", "");
lines.push(report.shortcodes.length ? report.shortcodes.map((s) => `- \`${s.id}\`: \`${s.html.replace(/\n/g, " ")}\``).join("\n") : "None.");

lines.push("", "## Missing media (referenced, not in the cache)", "");
lines.push(report.missingMedia.size ? [...report.missingMedia].map((m) => `- ${m}`).join("\n") : "None.");

lines.push("", "## External links", "");
lines.push(report.external.size ? [...report.external].sort().map((m) => `- ${m}`).join("\n") : "None.");

lines.push("", "## Unrecognised elements", "");
const ut = Object.entries(report.unknownTags);
lines.push(ut.length ? ut.map(([t, v]) => `- \`<${t}>\` (${v.size})`).join("\n") : "None.");

mkdirSync(dirname(P("docs/extract-report.md")), { recursive: true });
writeFileSync(P("docs/extract-report.md"), lines.join("\n") + "\n");

console.log(`pages written : ${results.length}`);
console.log(`sections      : ${results.reduce((n, r) => n + r.sections, 0)}`);
console.log(`unhandled css : ${uh.length} properties`);
console.log(`shortcodes    : ${report.shortcodes.length}`);
console.log(`missing media : ${report.missingMedia.size}`);

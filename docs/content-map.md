# Content map

Where every piece of the old site's content now lives, and where it came from.
None of this is inferable from the file shape, which is why the wp-migration
skill requires it written down.

## Where content comes from

Oxygen never puts builder output through `the_content`, so the WordPress REST
API returns **empty bodies** for every page. The content only exists in the
rendered front-end HTML. `wp-cache/` therefore holds a complete copy of the old
site (30 pages of HTML, 35 stylesheets, 1,011 media files and documents) and is
the extraction source. The REST API is used only for ids, slugs and links.

| Source | Used for |
|---|---|
| `wp-cache/html/<slug>.html` | Page content, the block tree |
| `wp-cache/css/css_<postId>.css` | Per-element styling, compiled to Tailwind |
| `wp-cache/css/css_universal.css` | Component defaults and the token census |
| `wp-cache/css/css_6.css` | Header, top bar and footer (Oxygen template post 6) |
| `wp-cache/uploads/**` | Every image and PDF, published to `public/uploads/` |
| `docs/wp-pages.json` | Post ids, slugs, canonical links |
| `docs/oxygen-computed.json` | The old site's computed styles, as base values |

## Collections

| Collection | Files | Rendered by |
|---|---|---|
| `pages` | `src/content/pages/<slug>.json` | `src/pages/[...slug].astro` → `Block.astro` |
| site chrome | `src/content/site.json` | `Header.astro`, `Footer.astro` |

Everything under `src/content/` is **generated**. Do not hand-edit it; the next
`npm run extract` overwrites it. Fix rendering in the templates or in
`scripts/extract-content.mjs`.

## Block kinds

The old site uses a closed vocabulary of 13 Oxygen component types, which map to
these block kinds. `Block.astro` dispatches on `kind`.

| kind | From | Notes |
|---|---|---|
| `section` | `.ct-section` | Carries the background image and the inner wrap |
| `columns` | `.ct-new-columns` | Row on desktop, stacked below 992px |
| `div` | `.ct-div-block` | Generic flex container |
| `heading` | `.ct-headline` | Keeps its original heading level |
| `richtext` | `.ct-text-block`, `.oxy-rich-text` | Inline HTML, links rewritten |
| `button` | `.ct-link-button` | |
| `link` | `.ct-link`, `.ct-link-text` | Walks children when it wraps components |
| `image` | `.ct-image`, `<img>` | |
| `html` | `.ct-code-block`, shortcodes | |
| `form` | Formidable container | Swapped for `ContactForm.astro` |
| `navmenu` | `.oxy-nav-menu` | The product sidebar on 19 pages |
| `tabs` | `.oxy-tabs-wrapper` | The RAL groups on `/colors/` |
| `group` | anything else | Keeps children so no text is lost |

## Styling

The old design had no token layer: it was ~1,000 ID-based one-off declarations
(`#headline-139-47{font-size:38px}`). `scripts/analyze-oxygen-css.mjs` mines
those into `docs/design-tokens.md`; the recurring values became the theme in
`src/styles/theme.css`, and `scripts/lib/css-to-tw.mjs` compiles each element's
declarations into Tailwind utilities.

Two things that make this correct rather than approximate:

- **Oxygen is desktop-first, Tailwind is mobile-first.** A `@media
  (max-width:991px)` rule is not an `lg:` utility - emitting it as one puts the
  desktop value on phones. The compiler resolves each property per viewport
  range and emits a class only where the value changes going up.
- **A property overridden only at a narrow breakpoint has no wide value in the
  element's own rules.** The wide value comes from a tag rule, an inherited
  value or a component class. `scripts/probe-styles.mjs` records what the old
  site actually computed at desktop width, and that seeds the base.

## Images

Published under `public/uploads/<year>/<month>/`, the WordPress path preserved
so any file traces back. Background images are bound through a CSS custom
property (`--bg-image`) because the URL is content; the declarations live in
`theme.css`.

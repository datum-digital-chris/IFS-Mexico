# IFS Coatings Mexico

WordPress (Oxygen) → Astro migration of https://ifscoatings.mx/.
Spanish, 29 pages. Migrated as a pixel-for-pixel port, then **deliberately
restyled** (September 2026) to look contemporary with no content change — see
`docs/design-system.md`.

## Commands

```bash
npm run dev            # ask the user to run it - never start/stop the dev server
npm run build          # astro build + redirects + asset check
npm run verify         # typecheck + lint (run before committing)

npm run inventory      # rebuild docs/url-ledger.csv and docs/asset-census.csv
npm run extract        # regenerate src/content/ from wp-cache/
npm run compare        # text fidelity: every sentence on the old page survives
npm run verify:layout  # visual fidelity: every element's geometry, old vs new
```

## How this migration works

Oxygen stores layout as builder JSON and never passes it through
`the_content`, so the WordPress REST API returns empty page bodies. Content
only exists in the **rendered front-end HTML**, and the design only exists as
~1,000 ID-scoped CSS declarations (`#headline-139-47{font-size:38px}`).

So the pipeline is:

1. **`wp-cache/`** - a complete local copy of the old site (HTML, CSS, media).
   Everything downstream reads from here, so the migration does not depend on
   the old host staying up. Not in git; re-fetchable while the old site lives.
2. **`scripts/analyze-oxygen-css.mjs`** - parses the stylesheets into a
   per-element style map and mines the value census in `docs/design-tokens.md`.
3. **`scripts/probe-styles.mjs`** - records what the old site *computed* at
   desktop width, which supplies base values that exist nowhere in the element's
   own rules.
4. **`scripts/extract-content.mjs`** - walks the Oxygen DOM into a typed block
   tree, compiling each element's CSS into Tailwind utilities via
   `scripts/lib/css-to-tw.mjs`.
5. **`src/components/Block.astro`** - one recursive renderer for all 13 Oxygen
   component types.

`src/content/` is **generated**. Never hand-edit it: fix the templates or the
extractor. See `docs/content-map.md`.

## Verification

Three gates, because each catches something the others cannot:

| Gate | Checks | Status |
|---|---|---|
| `npm run build` | pages render; every referenced asset exists | 30 pages, 2,770 refs, 0 missing |
| `npm run compare` | every sentence of old copy survives | 924 runs, 0 missing |
| `npm run verify:layout` | every element's geometry vs the OLD design | expected to fail since the restyle; kept as a record |

`verify:layout` writes `docs/layout-diff.csv`. Because the rebuild keeps
Oxygen's element ids, every element can be matched one-to-one against the old
site and measured at two viewport widths.

Deliberate differences are listed in **`docs/deviations.md`** and encoded in the
scripts, so an accepted change never reads as a regression.

## Published media

`public/uploads/` holds only what the build references (`npm run prune`), and
images are capped at twice their displayed size (`npm run optimize`). That is
43MB rather than the 168MB the old site served - the pruned files were
WordPress `srcset` variants nothing links to, and the RAL swatches were
1181px PNGs displayed at 219px. `wp-cache/uploads/` keeps every original.

## Deploy

Netlify. `netlify.toml` builds with `npm run build` and publishes `dist/`.
Redirects are generated into `dist/_redirects` from `docs/url-ledger.csv`, which
is the single source of truth for every URL decision.

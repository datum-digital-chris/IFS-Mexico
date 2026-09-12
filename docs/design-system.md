# Design system

The September 2026 refresh. The brief changed at this point: the site no longer
has to match the old one pixel for pixel, it has to look contemporary — **with
no change to any content**. Layout and copy are untouched; only presentation
moved.

`npm run compare` is the guard on that promise: it checks every sentence-sized
run of text from the old site still appears on the matching new page. It passes
with 0 missing.

## How the restyle works

Styling is compiled from the old Oxygen CSS into per-element Tailwind utilities,
and a utility compiled onto an element always beats a rule in the theme. So the
refresh could not be written in CSS alone.

`scripts/extract-content.mjs` carries a **restyle layer** that drops the
declarations constituting the old *decoration* and keeps those constituting the
*layout*:

| Dropped | From | Why |
|---|---|---|
| `color` (brand red or `#52565a` only) | headings | Every heading was red, so nothing was emphasised. Other colours — white over a hero — are kept, or the heading disappears into its background. |
| `font-family`, `font-weight` | headings | Headings were set in Noto Sans JP, a Japanese face doing Latin work. |
| `color`, `background-color`, `border` | buttons | Grey-on-grey, and failing contrast. |
| `color`, `background-color`, `border` | tabs | All three tabs carry the "active" class, so none could show as selected. |
| `box-shadow` | everything | `2px 2px 4px 2px #52565a` — a hard offset shadow. Replaced by a hairline border. |
| `color`, `background-color`, `background-image` | header/footer | Rebuilt components; the theme owns their palette. |

Widths, flex, padding, margins and section backgrounds are all kept, which is
why the page heights barely move.

## The system

**Colour.** IFS red (`#fc0004`) is unchanged but demoted to an accent: links,
buttons, the active navigation state, rules. Headings are near-black
(`#16181d`), body copy `#3f4650`. The old neutrals (`#eee` / `#e5e5e5` /
`#c9c9c9`) sat too close together to build structure and were replaced with a
separated ramp (`#f5f6f8` / `#eaedf0` / `#dde1e6`) plus a dark `#23272c` for the
top bar and footer.

**Type.** Archivo for headings — a contemporary industrial grotesk — and Roboto
retained for body copy. Noto Sans JP and Nunito Sans are gone. The scale now has
real contrast (`h1` fluid 32→48px against a 30px `h2`) so a page title cannot be
mistaken for a subhead, with tightened tracking and `text-wrap: balance`.

**Surface and depth.** Square corners; hairline borders instead of shadows; a
card picks up the brand colour on its border on hover. Adjacent sections
contrast. This follows the house style in `.claude/rules/00-core/CLAUDE.core.md`.

**Chrome.** The white→grey gradient masthead and its mirrored footer were the
most dated elements; both are now flat. The header is sticky with a single
hairline rule, which matters on product pages several thousand pixels long.

**Accessibility.** The old site had no focus indicator at all; there is now a
brand-coloured `:focus-visible` ring. Buttons moved from grey-on-grey to solid
brand with white text. Both navigations work without JavaScript.

## The home page

The restyle above changed the paint but not the structure, and on the home page
the structure was the problem: the seven markets were rendered as seven
full-width alternating slabs, about 3,000px to present what is really a
seven-item list. Nothing could be compared against anything else, and "conoce
más" appeared seven times down the page.

`src/pages/index.astro` now presents the same content as a grid:

- The hero's three slogans become one headline plus a supporting line, so the
  page opens with a hierarchy instead of three equal claims. The scrim is
  directional rather than flat, so the powder photograph still reads.
- *"IFS Coatings Internacional / Encuentra los Revestimientos en Polvo Adecuados
  para su Mercado…"* was a photo band competing with the hero. It is the heading
  for the markets, so it is used as one.
- The seven markets become a responsive card grid (3 / 2 / 1 across). Each card
  is a stretched link, with the original "conoce más" kept as the visible
  affordance.

Result: **4,040px → 2,761px on desktop (-32%)**, 5,827px → 4,628px on mobile,
with every word retained — `npm run compare` stays at 0 missing.

The content model is derived by `scripts/extract-content.mjs` into
`src/content/home.json`; every string and image is read out of the extracted
page, and the script warns if the source page's shape stops matching. The
generic `[...slug].astro` route excludes the home slug so the two do not clash.

### One fault fixed

On *Industriales Generales* and *Maquiladores* the old site's background image
and foreground `<img>` were swapped — a workshop photo captioned "Industriales
Generales" and a factory photo captioned "Maquiladores". The background was
correct on all seven cards, so the grid reads from the background and the
pairing is right.

## The Mercados pages

All seven markets shared one shape: a bare photo band carrying **no title**,
then 140–750 words of unbroken prose beside a floating sidebar, with **zero
images in the body**. `src/layouts/MarketLayout.astro` gives them a common
structure:

- A page header — eyebrow, title, market photograph with a directional scrim.
  The title was previously buried as the first heading in the body; it is lifted
  into the header, so the page opens by saying what it is.
- An 80ch measure for the article, with a hairline divider above each `h2` so
  the sections are visible at a glance. The opening paragraph is set larger.

  Two things make 80ch actually happen. The panel is `border-box`, so a plain
  `max-width: 80ch` caps the panel *including its padding* and the line lands
  at ~73ch; the padding is therefore declared in CSS and added back
  (`calc(80ch + 2 * var(--prose-pad))`). And the column has to be wide enough
  for the cap to be what binds rather than the layout — at Oxygen's 1120
  container the text could only reach 68ch, so the site container is now
  1200px. Oxygen compiles its own `max-width: 1120px` onto every section inner
  wrap, so `cfg.oxygenContainerWidth` → `cfg.containerWidth` rewrites that too;
  without it the masthead overhangs every extracted page by 40px a side.
- A supporting photograph placed after the opening passage — never directly
  after a heading, which would separate it from its own text.
- A sticky "Mercados" card listing all seven with the current one marked. The
  sticky element is nested **inside** the grid item rather than being the item:
  `align-self: start` collapses a grid item to its content height, which leaves
  the sticky element nothing to travel within, so it never moves. The item
  stretches and the inner wrapper sticks.

### Giving them presence

The first pass was correct but flat — clean prose in a column. These pages are
overwhelmingly **lists**: applications, benefits, standards. Rendering those as
plain bullets is what made them read as an undifferentiated wall.

- **Feature lists.** `tagFeatureLists()` in the extractor marks a list as a
  feature grid when it is flat and its items are labels rather than paragraphs.
  Those render as two columns with a brand check (drawn in CSS, so it is
  identical in every font) and hairline separators. Items over ~52 characters
  get `--wide` and stay in one column; over ~130 characters the list stays a
  plain list. 95 lists across the site convert. The threshold deliberately errs
  towards converting: one styled list among three plain ones looks like a
  mistake.
- **A taller hero** — 320/400/440px by breakpoint, bottom-aligned, with a larger
  fluid title and a brand bar beneath it.
- **Section openers** — a short brand bar above each `h2` rather than a plain
  hairline, so a section has a visible start.
- **The article as a panel** — white, hairline-bordered, on a tinted page. The
  body had been white-on-white from the hero to the footer with nothing to give
  it edges.

### The closing CTA

Every Mercados page now ends with a call-to-action band — the house rule in
`.claude/rules/00-core/CLAUDE.core.md` is that every page ends with one, and
these previously just stopped after the last paragraph.

Copy is **authored**, in `src/content/market-cta.json`: an action heading naming
the market, one line on what the representative provides, and a button. Shape
and tone follow the equivalent blocks on the US site (`content/markets/*.md`,
`type: cta`); the button reuses the site's own existing term, *Contáctenos*, and
links to `/contactenos/`.

The band is deliberately quiet: a white surface with a brand rule across the
top, a compact heading and the standard button. It closes the page without
competing with the hero, and still separates the tinted page above from the dark
footer below.

One implementation note: the market key is carried on the content model
(`market.key`) rather than derived from the route, because `trailers-2`
publishes at `/trailers/` and the two identifiers diverge — deriving it silently
dropped the CTA from that one page.

### Imagery

The Mexican site had no market photography, so hero and supporting images come
from the IFS Coatings US library, mapped in `cfg.markets` and copied by
`npm run import-images` (which caps the long edge at 2000px and re-encodes —
the originals run to 3000×4500 and 1.9MB). 11 images, 4.7MB. **This is the only
place new material was introduced; all copy is still the extracted original.**

### Faults this exposed

Restructuring made three existing faults visible, all now fixed:

1. **A duplicated heading.** "Productos de polvo arquitectónico" appeared twice
   in a row, once as a second `h1`. Body `h1`s are demoted (the page has its own
   now) and a heading that merely repeats the one before it is dropped.
2. **A broken shortcode.** `[wpdatatable id=2]` prints as literal text on the
   old site too — the plugin is not installed. Blocks whose entire content is a
   shortcode are marked `unresolved` and left out rather than reproduced as
   broken text. Listed in `compare-content.mjs` `EXPECTED`.
3. **Arbitrary red rules.** The old design drew a 2px brand rule under some text
   blocks; against the new rhythm they landed at random. Dropped in the restyle
   layer.

### The AAMA table

`/mercado-arquitectonico/` says "…se destacan en la siguiente tabla:" and then,
on the old site, printed the literal text `[wpdatatable id=2]` — the plugin is
not installed, so the table has never rendered on the live site.

The figures were recovered from the IFS Coatings US repo
(`content/architectural/index.md`, `aama.rows`), where the same table drives
both the Architectural page and the Spec Builder. They are authored in Spanish
in `src/content/tables/aama.json` and rendered by `SpecTable.astro`, mapped to
the shortcode through `cfg.shortcodeTables` so the slot is filled where the
sentence points.

**This is authored content, not extracted** — the only Spanish text on the site
that was written rather than migrated, and the figures are technical
specifications, so it warrants review before launch.

Two decisions recorded there:

- The source's description and footnote are **omitted**: the Mexican page
  already carries equivalent sentences either side of the table, and including
  them would duplicate the copy.
- The product row reads **IFS 500P**, matching this page's own body copy. The US
  site calls the same product **IFS 500FP**. One of the two is wrong and it is
  worth settling, because it is the code a specifier writes into a construction
  document.

## Note on `verify:layout`

That gate measured the rebuild against the old site element by element, and it
reached 91.2% exact at ±2px before this refresh. It is **expected to fail now**
— the design has deliberately moved. It is kept because it still reports what
changed, and `docs/layout-diff.csv` remains a useful record. `npm run compare`
is the gate that must stay green.

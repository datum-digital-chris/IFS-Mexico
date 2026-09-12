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
declarations constituting the old _decoration_ and keeps those constituting the
_layout_:

| Dropped                                         | From          | Why                                                                                                                                            |
| ----------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `color` (brand red or `#52565a` only)           | headings      | Every heading was red, so nothing was emphasised. Other colours — white over a hero — are kept, or the heading disappears into its background. |
| `font-family`, `font-weight`                    | headings      | Headings were set in Noto Sans JP, a Japanese face doing Latin work.                                                                           |
| `color`, `background-color`, `border`           | buttons       | Grey-on-grey, and failing contrast.                                                                                                            |
| `color`, `background-color`, `border`           | tabs          | All three tabs carry the "active" class, so none could show as selected.                                                                       |
| `box-shadow`                                    | everything    | `2px 2px 4px 2px #52565a` — a hard offset shadow. Replaced by a hairline border.                                                               |
| `color`, `background-color`, `background-image` | header/footer | Rebuilt components; the theme owns their palette.                                                                                              |

Widths, flex, padding, margins and section backgrounds are all kept, which is
why the page heights barely move.

## The system

**Colour.** The scheme is the one the US site runs
(`~/GitHub/IFS-Coatings`, `src/styles/global.css`), ported whole rather than
approximated. It is built from **two seeds, split by role**:

|                 | Seed                | Used for                                                                        |
| --------------- | ------------------- | ------------------------------------------------------------------------------- |
| `--seed-action` | `#e21e24` — IFS red | INTERACTIVE: links, buttons, focus, the active nav state, a card's hover border |
| `--seed-accent` | `#1f2937` — ink     | DECORATIVE: eyebrows, rules, checks, the closing CTA fill                       |

Each seed derives an eight-step ramp by `color-mix` in sRGB (oklab desaturates
reds; oklch swings them towards orange), so changing a seed moves everything
that hangs off it. The split is the point: a colour used for everything says
nothing about what is clickable, which is exactly what the old site did with
red. Three rungs carry the contrast budget — `--action-dark` at 6.5:1 on white
for anything red that carries text, `--action-light` at 4.8:1 for red on the
dark surface, `--accent-dark` for ink labels on light.

A brand fill is the **metallic sweep** (`.ox-brand-fill`, `.ox-btn`), never a
flat hex: one gradient recipe that simulates light travelling across a
powder-coated surface, which is the product the company sells.

Structural colour comes across with it: headings `#111827`, body `#4b5563`,
muted `#6b7280` as the legibility floor, rules `#e5e7eb`. Surfaces are white,
`#fafafa` for cards and grid cells, `#ebebeb` for the alternating light
section, and `#111827` / `#1f2937` / `#0d1117` for the dark ones. `#fafafa` is
too close to white to carry a section break, so the two surfaces that alternate
are white and `#ebebeb`.

The one thing that did **not** come across is the panel hover shadow the US site
reintroduced: the house style in `.claude/rules/00-core/CLAUDE.core.md` is a
border-colour change on hover and never a shadow.

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
2px `:focus-visible` ring in the action colour — focus is an interactive state,
so it takes the interactive seed. Buttons moved from grey-on-grey to solid
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
- _"IFS Coatings Internacional / Encuentra los Revestimientos en Polvo Adecuados
  para su Mercado…"_ was a photo band competing with the hero. It is the heading
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

On _Industriales Generales_ and _Maquiladores_ the old site's background image
and foreground `<img>` were swapped — a workshop photo captioned "Industriales
Generales" and a factory photo captioned "Maquiladores". The background was
correct on all seven cards, so the grid reads from the background and the
pairing is right.

## The Mercados pages

All seven markets shared one shape: a bare photo band carrying **no title**,
then 140–750 words of unbroken prose beside a floating sidebar, with **zero**
images in the body. The first restyle gave that shape a header and a readable
measure. It is now rebuilt instead to the design philosophy the US site uses
for _Markets We Serve_, which is a different idea about what the page is.

The reference is `~/GitHub/IFS-Coatings`: `content/markets/*.md` rendered
through `src/components/blocks/`, and the principles written up in its
`docs/style-guide.md`. Four things carry across:

- **A page is a sequence of full-bleed sections on alternating surfaces**, not
  one article in a column. Adjacent sections always contrast, and the sequence
  ends on the red CTA band — the only place red fills a section, which is why
  red is not spent anywhere else.
- **Every section opens with a red eyebrow over a heavy display heading.** The
  eyebrow identifies in two or three words; the heading is `font-weight: 800`
  with negative tracking, a long way clear of the body text.
- **Data-forward layouts.** Lists of applications, benefits and standards are
  first-class design elements, rendered as hairline-divided grids rather than
  bullets. Information density is a feature.
- **No sidebar.** Cross-links to the other markets go in a band ahead of the
  CTA, and the breadcrumb says where you are.

So the page is now:

```
photo hero  →  breadcrumb + overview panel  →  one band per section
            →  the other markets  →  CTA
```

### Grouping the copy into sections

The US pages are authored into that shape — `type: hero`, `type: overview`,
`type: applications`, `type: cta`, each with its own fields. These pages are one
flat run of extracted prose, so the run is **grouped** into the same shape by
`scripts/extract-content.mjs` rather than restated:

| Derived                                          | From                                              |
| ------------------------------------------------ | ------------------------------------------------- |
| `lead.hero` — the hero standfirst                | the opening `<p>` of the first prose block        |
| `lead.headline` — the overview's display heading | a heading that opens the page, where there is one |
| `lead.body` — the overview copy                  | whatever is left before the first `h2`            |
| `sections[]` — one band each                     | every `h2` and the blocks under it                |
| `sections[].items[]` — numbered items            | every `h3` nested inside an `h2`                  |

Two details decide whether this reads as content or as rearranged content:

- **The opening paragraph is not lifted if it ends in a colon.** On
  _Maquiladores_ it introduces the list immediately below it, and the two cannot
  be separated. That page's hero carries the title alone.
- **Grouping is checked, not trusted.** The extractor reduces the block tree to
  its letters and digits before and after grouping and warns if the two differ
  by a single character. Moving copy around a page is safe; losing a paragraph
  in the move would not be, and this is what distinguishes them.

The `h2`/`h3` mapping turns out to fit the source closely. _Repintado_ has three
`h2` sections of 270–550 characters each — a band apiece. _Maquiladores_ nests
twelve `h3`s under "Acabados en polvo", which is exactly the shape of the US
site's numbered advantage grid, and renders as one.

### The sections

- **Hero.** 480px on a phone, 68vh on a desktop, bottom-aligned, with a brand
  rule along the top edge and a directional scrim so the photograph still reads
  on the open side. The US hero also carries a cluster of term/definition spec
  tiles; there is no counterpart in this copy, and filling the column by
  hoisting a bulleted list out of the body would separate the list from the
  sentence that introduces it. The column is left to the photograph.
- **Overview.** Breadcrumb, then a white panel with a brand rule across the top:
  the opening passage at one step above body size against the market
  photograph. Where there is no photograph the panel is capped to the measure of
  its own copy rather than stretched across the container with a void beside the
  text.
- **Section bands.** Eyebrow (the market), display heading, prose at a 72ch
  measure. A spec table breaks out of that measure to the full section width —
  four columns of AAMA data at 72ch are cramped.
- **Numbered items.** Index, heavy headline, passage; two columns, hairline
  divided.
- **The other markets.** The old sidebar, as a dark band of six: the market you
  are on is left out, because the breadcrumb already says so and six fills the
  grid exactly.

### Hairlines on the cells, not gaps over a parent

Every grid on these pages — feature lists, numbered items, the cross-link band —
is a bordered block of cells divided by hairlines. The US site draws those with
`gap-px` over a coloured parent, which is shorter, and wrong here: most of these
lists have an odd number of items, so the last slot is empty and the parent
colour shows through it as a stray filled tile. The rules are drawn on the cells
instead (`.feature-list`, `.market-items`, `.market-nav` in `theme.css`), which
holds at any item count. The cells take the card tint (`#fafafa`) so a grid
reads as cells on either of the two light section surfaces.

### Lists

`tagFeatureLists()` in the extractor marks a list as a feature grid when it is
flat and its items are labels rather than paragraphs. Those render as two
columns with a check drawn in CSS in the decorative accent, so it is identical
in every font. Items
over ~52 characters get `--wide` and stay in one column; over ~130 characters
the list stays a plain list. 95 lists across the site convert. The threshold
deliberately errs towards converting: one styled list among three plain ones
looks like a mistake.

### The closing CTA

Every Mercados page ends with a call-to-action band — the house rule in
`.claude/rules/00-core/CLAUDE.core.md` is that every page ends with one, and
these previously just stopped after the last paragraph.

Copy is **authored**, in `src/content/market-cta.json`: an action heading naming
the market, one line on what the representative provides, and a button. Shape
and tone follow the equivalent blocks on the US site (`content/markets/*.md`,
`type: cta`); the button reuses the site's own existing term, _Contáctenos_, and
links to `/contactenos/`.

It is a brand-filled band with a white button, terminal on the page, as it is on
the US site — the one place the decorative accent covers a whole section, which
is the reason it is not spent anywhere else. The decorative seed is ink, so the
band is the metallic slate sweep (`.ox-brand-fill`) rather than a red one, and
it is a gradient rather than a flat hex.

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

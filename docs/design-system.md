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

## Note on `verify:layout`

That gate measured the rebuild against the old site element by element, and it
reached 91.2% exact at ±2px before this refresh. It is **expected to fail now**
— the design has deliberately moved. It is kept because it still reports what
changed, and `docs/layout-diff.csv` remains a useful record. `npm run compare`
is the gate that must stay green.

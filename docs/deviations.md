# Deliberate differences from the old site

> **Superseded in part (September 2026).** The brief changed: the site is now
> deliberately restyled to look contemporary, with no content change. See
> `docs/design-system.md`. The items below still record every _content_ and
> _behaviour_ difference, which remains the thing that must not drift.

The original brief was "look exactly like the old one". Everything below is a place the
rebuild does **not** match the original, with the reason. Nothing here is
accidental drift; accidental drift is what `npm run verify:layout` measures.

Each entry is also encoded in a script, so an accepted difference cannot be
confused with a regression:
`EXPECTED` in `scripts/compare-content.mjs`, `DEVIATIONS` in
`scripts/verify-layout.mjs`.

---

## 1. The colours page now shows colours

**Old:** `/colors/` ships with no tab selected. All three RAL panels carry
`oxy-tabs-contents-content-hidden`, so **zero** of the 190 colour swatches are
visible on load. They only appear if the visitor happens to click one of the
three red buttons. Verified against the live site: 0 swatches visible on load,
64 after clicking the first tab.

**New:** the first tab is selected by default, and tab switching works without
JavaScript (a radio group and sibling selectors).

**Why:** reproducing this faithfully would mean shipping a colour page that
shows no colours. This is a fault, not a design.

## 2. Nine images that 404 on the live site now load

**Old:** the Oxygen CSS points nine background images at
`ifsmexico.us11.cdn-alpha.com`, a CDN alias that returns **404**. The most
visible consequence is the `/colors/` hero, which is blank white on the live
site.

**New:** all nine resolve to the local copies under `/uploads/`.

**Why:** the files exist and are correct; only the hostname is dead.

## 3. The site declares Spanish

**Old:** `lang="en-US"`, `og:locale=en_US`, and schema `inLanguage: en-US`, on a
site written entirely in Spanish.

**New:** `es-MX` throughout.

**Why:** it misdescribes the page to search engines and screen readers.

## 4. The contact form is a Netlify Form

**Old:** Formidable Forms, which needs PHP and cannot survive a static build.

**New:** rebuilt as a Netlify Form with the same fields, posting to `/gracias/`.
The field labels, which were in English ("Name", "Last", "Subject", "Message",
"Submit") on an otherwise Spanish site, are translated: Nombre, Apellido, Correo
electrónico, Asunto, Mensaje, Enviar.

**Revertible:** if the English labels are wanted back, they are in
`src/components/ContactForm.astro` and nothing else depends on them.

The honeypot label likewise moves from "If you are human, leave this field
blank" to Spanish. This is the one text run `compare-content.mjs` reports as
absent, and it is listed in that script's `EXPECTED`.

## 5. Header and in-page navigation are rebuilt, not ported

**Old:** both menus need JavaScript to open; with scripts blocked, the mobile
menu cannot be opened at all.

**New:** native `<details>` disclosures, so they work without JavaScript. The
geometry targets the original (34px top bar, 80px masthead, 80px logo at desktop;
stacked at 120px/110px/90px on mobile) but the internals differ.

**Why:** a navigation that cannot open is a functional defect.

The in-page sidebars are also gone as sidebars — "Mercados" on a market page,
"Polvos" on a product page. Their links are now a band across the foot of the
page, following the US site's layout (`docs/design-system.md`). Every link and
label survives except the self-link on the page you are already reading, which
the breadcrumb replaces.

## 6. A focus style exists

**Old:** no visible focus indicator anywhere.

**New:** a 2px brand-coloured focus ring on `:focus-visible`.

**Why:** keyboard operability. It is invisible to mouse users.

## 7. The stray WordPress sample post is retired

`/hello-world/` was the WordPress default post, never linked from the site. It
301s to `/`. `/trailers-2/` (a WordPress duplicate-slug suffix) 301s to
`/trailers/`.

## 8. Two swapped card images on the home page

**Old:** on _Industriales Generales_ and _Maquiladores_ the card's background
image and its foreground `<img>` disagree — `general-industrial-01.jpg` against
`custom-workshop-01.jpg` and vice versa. The visible result was a workshop photo
under "Industriales Generales".

**New:** both read from the background image, which is correct on all seven
cards.

**Why:** the pairing was plainly a mistake, and the grid makes it obvious.

## 9. The fluoropolymer product code is corrected to IFS 500FP

**Old:** the site used both forms. Its own fluoropolymer page says _IFS 500FP_
four times and _IFS 500P_ once; the architectural page says _IFS 500P_ once and
500FP never.

**New:** _IFS 500FP_ throughout, applied by `cfg.textCorrections` in the
extractor so the fix survives re-extraction, and matched in
`src/content/tables/aama.json`.

**Why:** the US site writes 500FP 38 times across its content and 500P once (in
a legacy extracted page), and the Mexican product page itself favours 500FP
four to one. The short form is a typo — and this is the code a specifier writes
into a construction document, so it is worth being right.

`compare-content.mjs` flags the one sentence this changes; it is listed in that
script's `EXPECTED`.

## 10. The colour scheme is the US site's, and so is the red

**Old:** `#fc0004` as the identity red, applied to every heading and every
link, over the Oxygen neutrals `#eee` / `#e5e5e5` / `#c9c9c9`.

**New:** the scheme `ifscoatings.com` runs — two seeds split by role
(`#e21e24` red for anything interactive, `#1f2937` ink for anything
decorative), each deriving its own ramp, over that site's structural neutrals.
Full detail in `docs/design-system.md`.

**Why:** it is the same company and the .com is the canonical brand site, so
the two should not be two different reds. `#fc0004` and `#e21e24` are both "IFS
red"; the Mexican WordPress carried the more saturated approximation.

**Consequences worth knowing:** red no longer appears as a decorative accent —
eyebrows, rules and the closing CTA fill are ink, and red means "you can click
this". Brand fills are the metallic gradient, not a flat colour. `#e21e24` is
the value to change if the client wants their own red back; it is one line
(`--seed-action` in `src/styles/theme.css`) and the whole ramp follows.

**Revertible:** the two seed values are the only hand-written colours.

---

## 11. The masthead loses its black utility strip

**Old:** a black bar above the masthead carrying two links (Conocenos,
Contáctenos), the Mexican flag and the phone number, then a masthead with the
circular IFS mark on a white-to-grey gradient.

**New:** one row. The wordmark used on `ifscoatings.com`
(`public/uploads/ifs-logo.png`), the flag beside it behind a hairline, the nav,
and the phone number at the end of the row. The phone also repeats at the foot
of the mobile menu.

**Why:** the strip was a second navigation for items the main menu already
carried — Conocenos sits under Recursos and Contáctenos is a top-level item —
and it pushed the masthead 38px down the page on every view. No text is lost:
both links and the number are still on every page. The wordmark is the .com's
so the two IFS sites read as one company.

---

## 11b. The masthead is ifscoatings.com's, and carries search

**Old (and the first rebuild):** the masthead carried the phone number as its
right-hand item and had no search of any kind. The site's only way in was the
menu.

**New:** the row is the .com's — 60px tall, a 36px wordmark, 14px nav items —
and it ends with the two actions the .com ends with: a search trigger (⌘K, or
Ctrl K off Apple platforms) and the Contáctenos button. The phone number moved
out of the masthead; it is still on every page, in the contact flyout and in
the footer, which is where the .com keeps it too.

**Search** indexes all 28 pages and all 190 RAL colours
(`/search-index.json`, built from the same content the pages render). A colour
result lands on its own swatch. The index is fetched the first time the palette
opens, and the trigger is hidden until its script runs: with JavaScript
unavailable there is no search box rather than a dead one.

---

## 12. Contáctenos opens a flyout, and its page is laid out as a form

**Old:** Contáctenos was a link to a page that ran its copy down a prose column
with the form beneath it.

**New:** the masthead's Contáctenos opens a panel of contact options — the
form, a quote, the phone, the email — mirroring the panel on `ifscoatings.com`.
The panel's copy is authored in `src/content/contact.json` and is **not**
migrated content. `/contactenos/` itself is now the reference site's contact
layout: photo header, the form in a two-thirds column, and the page's own phone
number, email line and "si desea" list in the column beside it, over the links
to the rest of Recursos.

**Why:** a visitor who only wants the phone number should not have to load a
page to find it. Every word of the old page is still on it — `npm run compare`
stays at 0 missing — and the trigger is a real link to `/contactenos/`, so the
page is still reachable with JavaScript unavailable.

---

## 13. The colour page is one grid with a search, not three tabs

**Old:** 190 RAL swatches split across three tab panels labelled "RAL Colors
1", "2" and "3" — a division made where the first panel got long, carrying no
meaning. See #1 for the related fault (no tab selected on load).

**New:** one grid in RAL order, six across, over a search field and a row of
colour-family filters (Amarillos, Naranjas, Rojos, Violetas, Azules, Verdes,
Grises, Marrones, Blancos y negros). Each card carries its family's colour on
its top edge and its IFS code in a pill tinted to match. This is the shape the
US site gives the same content (`src/components/RalColorSearch.tsx`).

**Why:** the tabs hid two thirds of the range and nothing could be found. The
family names are authored — the only text added to the page — and the swatches,
their RAL numbers and their IFS codes are untouched.

**Header photograph:** replaced with `ifscoatings.com/ral-color/`'s, a fan of
coated chips (`/uploads/library/colors-hero.jpg`). The old one is a printed RAL
fan deck whose colour names read as a second set of labels behind the title.

**No-JavaScript behaviour:** the filter bar is hidden until its script runs.
The complete grid is the page; search narrows it, it is not how it works.

---

## 14. The powder-type headers are the .com's, page for page

**Old:** nine of the eleven Tipos de Polvo pages opened on the same handful of
generic powder-explosion graphics — nothing in the picture told you which
chemistry you were reading about, and Polvo Epoxi and Polvo Híbrido were
literally the same file.

**New:** each page takes the header `ifscoatings.com` gives the same chemistry:

| Página                             | ifscoatings.com                   |
| ---------------------------------- | --------------------------------- |
| Polvo de Poliéster Estándar        | `/standard-polyester-powder/`     |
| Polvos de Poliéster Superduraderos | `/super-durable-powder/`          |
| Polvo de Fluoropolímero (FEVE)     | `/fluoropolymer-powder/`          |
| Polvo Epoxi                        | `/epoxy-powder/`                  |
| Polvo Híbrido                      | `/hybrid-powder/`                 |
| Polvo Antimicrobiano               | `/anti-microbial-powder/`         |
| Polvo Antigrafiti                  | `/anti-graffiti-powder/`          |
| Imprimadores en Polvo              | `/primer-powders/`                |
| Polvo Aprobados por NSF            | `/nsf-powder/`                    |
| Polvo (ESD)                        | `/esd-powder/`                    |
| Polvos Termoplásticos IFS Puroplaz | `/puroplaz-thermoplastic-powder/` |

Antimicrobiano and ESD already carried the .com's shot; the other nine now do
too. UL Polvo has no counterpart on the .com, so it keeps the chemistry-guide
header. Mapped in `cfg.pageImages`, so the pairing is recorded rather than
remembered.

**Worth knowing:** these are 1900×300 banner strips on the .com as well, used
there in the same full-height header — so they upscale on both sites. They are
softer than the market photography, and identical to the reference.

---

## 15. The footer is a site map, and its "Contáctenos" link goes to Contáctenos

**Old:** a centred stack — the mission statement, the circular logo, a
"Contáctenos" link that pointed at `/conocenos/`, the email and the phone —
and no way into the rest of the site.

**New:** the reference site's footer. A brand column (the `ifscoatings.com`
wordmark knocked out to white, the mission statement, the phone and the email)
beside one column per section of the menu, then a legal bar carrying the
copyright and the two legal pages. The mission, phone, email and copyright are
the old footer's own strings; the columns come from the site's menu. The
mis-pointed link now goes to `/contactenos/`.

**Address:** the old site carries no postal address on any page, so the footer
has an address slot (`address` in `src/content/contact.json`) that renders
nothing until the client supplies one. No placeholder is shipped.

---

## Not a deviation: `[wpdatatable id=2]`

One shortcode on `/mercado-arquitectonico/` refers to a wpDataTables table.
It is carried across as-is and **does not render**, exactly as a shortcode for a
plugin that is not installed would not render. This is an open item, not an
accepted difference - see the extraction report.

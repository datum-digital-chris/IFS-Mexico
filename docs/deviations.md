# Deliberate differences from the old site

> **Superseded in part (September 2026).** The brief changed: the site is now
> deliberately restyled to look contemporary, with no content change. See
> `docs/design-system.md`. The items below still record every *content* and
> *behaviour* difference, which remains the thing that must not drift.

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

## 6. A focus style exists

**Old:** no visible focus indicator anywhere.

**New:** a 2px brand-coloured focus ring on `:focus-visible`.

**Why:** keyboard operability. It is invisible to mouse users.

## 7. The stray WordPress sample post is retired

`/hello-world/` was the WordPress default post, never linked from the site. It
301s to `/`. `/trailers-2/` (a WordPress duplicate-slug suffix) 301s to
`/trailers/`.

## 8. Two swapped card images on the home page

**Old:** on *Industriales Generales* and *Maquiladores* the card's background
image and its foreground `<img>` disagree — `general-industrial-01.jpg` against
`custom-workshop-01.jpg` and vice versa. The visible result was a workshop photo
under "Industriales Generales".

**New:** both read from the background image, which is correct on all seven
cards.

**Why:** the pairing was plainly a mistake, and the grid makes it obvious.

## 9. The fluoropolymer product code is corrected to IFS 500FP

**Old:** the site used both forms. Its own fluoropolymer page says *IFS 500FP*
four times and *IFS 500P* once; the architectural page says *IFS 500P* once and
500FP never.

**New:** *IFS 500FP* throughout, applied by `cfg.textCorrections` in the
extractor so the fix survives re-extraction, and matched in
`src/content/tables/aama.json`.

**Why:** the US site writes 500FP 38 times across its content and 500P once (in
a legacy extracted page), and the Mexican product page itself favours 500FP
four to one. The short form is a typo — and this is the code a specifier writes
into a construction document, so it is worth being right.

`compare-content.mjs` flags the one sentence this changes; it is listed in that
script's `EXPECTED`.

---

## Not a deviation: `[wpdatatable id=2]`

One shortcode on `/mercado-arquitectonico/` refers to a wpDataTables table.
It is carried across as-is and **does not render**, exactly as a shortcode for a
plugin that is not installed would not render. This is an open item, not an
accepted difference - see the extraction report.

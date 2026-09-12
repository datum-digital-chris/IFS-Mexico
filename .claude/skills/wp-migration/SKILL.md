---
name: wp-migration
description: Migrate a WordPress site (page-builder or classic) to a static content-driven stack without losing content. Covers inventory, extraction, normalisation, the document/asset pipeline, redirect discipline and the verification gate. Use when re-platforming a WP site, planning a migration, or auditing one that has already been extracted.
---

# WordPress → Static Migration

Portable core. Every rule is stated against a **capability** — "the extractor", "the content loader", "the host redirect layer" — never a framework. The concrete bindings live in `adapters/<stack>.md`.

Distilled from a completed migration of a ~700-item WordPress/Oxygen catalogue site to a static stack. The failure modes below are observed, not theoretical.

---

## 0. The one thing to get right

**"No content will be lost" is a claim about text, not about pages.** A page built in a visual builder stores its layout as builder-specific JSON. Extraction recovers the *text*; it does not recover the *layout*. Those pages arrive as flat prose and need redesigning.

Say this out loud before the project starts, quantify it in Phase 1, and never let it be discovered at review. A client who was promised "nothing lost" and receives 80 flattened pages has been mis-sold, even though every word survived.

---

## 1. Inventory before extraction (M-INVENTORY-FIRST)

Never extract first and count later. Produce these before touching a converter:

- **URL ledger** — one row per live URL: path, template type, title, word count, image count, canonical, indexed, 12-month sessions, and a **disposition** (`keep` / `move` / `merge` / `retire`) with a target and a reason. No row may end blank. This ledger *is* the redirect map later.
- **Content-type census** — every post type and taxonomy with its published count. Migrations are sized by this table, not by page count.
- **Builder exposure** — how many pages are builder-authored (and therefore layout-loss candidates) versus classic-editor or structured-field content.
- **Asset census** — media, and separately **documents** (datasheets, safety sheets, manuals). Documents are usually linked from outside the site — emails, printed specs, partner sites — so their URLs carry obligations that images do not.

Ship the ledger as a CSV artefact in the repo. It is a deliverable, not scaffolding.

---

## 2. Extraction (M-EXTRACT-*)

- **M-EXTRACT-GENERATED** — extracted content is a **build input, not source you edit**. Fix rendering problems in the loader or the components, never by hand-editing extracted files. Hand edits are silently destroyed by the next re-extraction, and they hide bugs that will recur on the next migration.
- **M-EXTRACT-MALFORMED** — assume the extractor emits invalid frontmatter. Literal block scalars whose body lines sit at the wrong indent level are the common case, and they crash strict YAML parsers on a minority of files. **Patch the text in the loader, in memory, before parsing.** Any offline tool that reads the same content (report generators, CSV builders) must apply the identical patch, so factor it out rather than writing it twice.
- **M-EXTRACT-PUBLISHED** — filter to published status at the loader boundary, once. Drafts, revisions and trashed items are in the export and will otherwise reach production.
- **M-EXTRACT-BODY-MAP** — body content does not live in one place. Classic pages carry a Markdown body; custom post types often keep theirs in a custom field, sometimes as raw HTML. Write the collection → body-location mapping into the repo docs as a table, because nothing about it is inferable from the file shape.
- **M-EXTRACT-FIELD-DRIFT** — the same logical field appears under several names across a site's history (a prefixed and an unprefixed variant is the usual pair). Resolve every field through an explicit fallback chain, preferring the canonical name. Never assume one spelling.
- **M-EXTRACT-DEDUPE** — catalogues accumulate duplicate items under one code. Deduplicate on the business key (product code), not the filename or title, and emit the duplicates as a report rather than dropping them silently.

---

## 3. Sparse-body detection (M-SPARSE-GATE)

Compute a body length for every extracted page and threshold it (a hundred characters is a reasonable line). Below the threshold the page is a layout-loss casualty.

Then do all three:

1. **Count them** and report the number, before design starts.
2. **Render a deliberate placeholder** rather than an empty page — an honest "this page is being redesigned" state, never a blank template.
3. **Track them to closure** in a checklist artefact in the repo, so an unredesigned page cannot quietly reach launch.

A sparse page that renders empty and is never counted is how content silently disappears in a migration that everyone believed was lossless.

---

## 4. URLs, media and documents (M-URL-*)

- **M-URL-REWRITE-INTERNAL** — absolute URLs to the origin domain must be rewritten to relative paths at render time. **Include sibling domains**: client groups cross-link between their own sites, and those links are internal to the group even when the hostname differs. Keep the list of internal hosts in one place.
- **M-URL-MEDIA** — rewrite upload paths to the new media root through a single function, applied at *every* bind site including featured images and HTML bodies. One shared rewriter, never per-component string surgery.
- **M-URL-DOCUMENTS** — resolve documents in a defined order: local file matched by business code first, then the rewritten origin URL, then blank. Emit a **missing-document report** as a CSV artefact. Code-to-filename matching needs a normaliser (strip suffixes, case-fold, handle separator variants); write it once and share it between the loader and the reporting scripts.
- **M-URL-SHORTCODES** — builder and plugin shortcodes survive extraction as literal text in the body. Convert the ones that matter (embeds especially) in the HTML renderer, and grep the corpus for remaining `[...]` patterns before launch.

---

## 5. Redirects (M-REDIRECT-WIRED)

**An extracted redirect file that is not wired to the host layer is not a migration step — it is a note.**

This is the most common half-finished task in a re-platform: the rules get exported into a data file, everyone sees the file, and nobody connects it to the host. State the binding in the adapter, and treat "redirects wired and verified against the live domain" as a launch gate with its own checklist line.

Verification is not "the file has N rules". It is: request every `move`/`merge`/`retire` URL from the ledger against the deployed site and assert a 301 to the intended target. Automate it; run it after DNS, not only on staging.

---

## 6. Verification gate (M-VERIFY)

A migration is done when these all pass, and not before:

- Published counts per collection match the pre-migration census, or every difference is explained in writing.
- Every ledger row has a disposition, and every non-`keep` row resolves with a 301 on the live host.
- The missing-document and duplicate reports are empty or explicitly accepted.
- Sparse pages are zero, or listed and accepted with a redesign date.
- Documents linked from outside the site resolve — spot-check the ones referenced in client emails and printed material.
- Search Console coverage is watched daily for the first month, with the pre-migration indexed count as the baseline.

---

## 7. Reusable artefacts

Every migration should leave these in the repo. They are how the next one costs a fraction of this one:

| Artefact | Purpose |
|---|---|
| URL ledger CSV | Dispositions and the redirect map |
| Catalogue CSV | Every item with code, name, image URL, document URL |
| Missing-document report | Items whose datasheet could not be resolved |
| Duplicate-code report | Catalogue integrity |
| Sitemap / IA document | The intended structure, not the extracted one |
| Page redesign checklist | Sparse pages tracked to closure |
| The generator scripts | Re-runnable, so reports refresh as content is fixed |

---

## 8. Sequencing

1. **Inventory** — ledger, census, builder exposure, asset and document counts.
2. **Extract** — to a generated content directory, treated as read-only.
3. **Normalise** — loader patches malformed frontmatter, filters published, resolves field drift.
4. **Map bodies** — collection → body-location table, written down.
5. **Assets** — media and document pipelines, with missing-item reports.
6. **Compose** — templates and blocks per the content-architecture rules (see `content-architecture`).
7. **Redirects** — wire to the host layer and verify against the deployed site.
8. **Verify** — the §6 gate, then launch (see `launch-checklist`).

---

## Placeholders for the adapter

`<<CONTENT_DIR>>` · `<<LOADER_FILE>>` · `<<URL_REWRITER>>` · `<<MEDIA_REWRITER>>` · `<<DOCUMENT_RESOLVER>>` · `<<REDIRECT_SOURCE>>` · `<<HOST_REDIRECT_BINDING>>` · `<<REPORT_SCRIPTS>>`

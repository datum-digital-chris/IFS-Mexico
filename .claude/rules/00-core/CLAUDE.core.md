<!--
  CLAUDE.core.md — PORTABLE CORE (framework-neutral).

  This file states the invariants that hold regardless of framework, brand, or
  product. It names NO framework and NO product. Every concrete binding —
  which file authenticates a request, which command runs migrations, which
  file holds the design tokens — lives in a STACK ADAPTER
  (rules/adapters/<stack>.md), never here.

  To produce a repo's CLAUDE.md: concatenate this file with the matching
  adapter and replace every <<PLACEHOLDER>>. If you ever need to write a
  framework name into THIS file to make a rule make sense, the rule belongs in
  the adapter instead — that is the one bug this split exists to prevent.
-->

# Engineering Core — Portable Rules & Trust Model

This site is a static, content-driven marketing/ecommerce site with three layers:

1. **Static content** — authored content (Markdown/MDX/structured data) drives every page through a typed **composition system**, edited through a **CMS**.
2. **Commerce runtime** — client-side cart + auth in the browser; all money and identity decisions happen in a **serverless backend**, never the client.
3. **Persistence** — a relational database (with row-level security) for user profiles and orders; a payment processor for payment state.

The **stack adapter** (`<<ADAPTER_FILE>>`) binds each capability below to the concrete file, command, or plugin in this repo. Read it alongside this file.

---

## 0. The two-layer principle (governs everything)

Every rule here is written against a **capability**, not a product: "the serverless payment handler", "the content source", "the DB migration tool", "the design-token set". That is the portable core. The **thin binding** that maps a capability to a concrete file/command is the stack adapter, and is the only part rewritten per repo. A rule that hardcodes a framework filename in the core is a bug — move it to the adapter.

---

## 1. Working constraints (carried verbatim — do not relax)

- **Never start or stop the local dev server.** Always ask the user to run it. They manage the dev process directly.
- **Never run schema-changing SQL by hand.** No dashboard SQL editor, no `psql`, no ad-hoc query for DDL/DML. All schema changes go through a migration file applied by the migration CLI. (Read-only inspection queries are fine.) See §6.
- **No inline `style` props / attributes for static values.** All visual properties live in the stylesheet layer. The *only* exception is a genuinely dynamic runtime value expressed as a CSS custom property (e.g. `style={{ '--swatch-bg': hex }}`), and even then the visual properties live in CSS referencing that variable. See §5.
- **No emoji** in responses or code unless explicitly requested.
- **No trailing summaries** after completing work — the diff is the summary.
- Terse, direct communication. One sentence per update is usually enough.
- For actions that are hard to reverse or outward-facing (deploys, sending email, DNS, production DB pushes), confirm first unless durably authorized.

---

## 2. Content architecture — the composition model (capability rules)

Every page is composed from a **typed array of content blocks** ("panels"/"sections") declared in the content file's frontmatter. A block has a `type` and whatever fields that type needs. A generic router picks a **template by a `templateKey`-style field**; the template hands the block array to a shared renderer that dispatches each block to a component **by its `type` string**.

Invariants (violating any of these produces the "unknown block" fallback or silent drift):

- **C-TYPE-IDENTITY** — the block `type` string == the renderer's component name/key == the CMS block-type name. These three must be byte-identical. Any drift renders the error fallback.
- **C-PANEL-SHAPE** — every block has a `title` (stable list key) and a `theme` (`light`/`dark`, drives the theme modifier). Keep this invariant or list keys and theming break.
- **C-IMAGE-SHAPE** — image fields are **always** `{ url, alt }` (one shared image type), never a per-block bespoke image shape.
- **C-ROUTER-GENERIC** — the router resolves the template from the content-type key generically. **Adding a new page type never requires editing the router** — only: a new template, a matching CMS collection, and content files that set the key.
- **C-DISPATCH-SAFE** — block dispatch is a **whitelisted** lookup, not raw property access on an object (guard against `__proto__`/prototype pollution): check membership in a known set before dispatch.
- **C-FULL-UNION** — the renderer receives the **full union** of block fields; only the fields present on a given block instance are populated. Don't diverge the field set per template (image sizes may differ; the *set* may not).

### C-SYNC-DRIFT — the N-point sync invariant (the #1 source of bugs)

Adding or editing a block type touches **several files that must stay in lock-step**. The concrete list of files is in the adapter; the *rule* is: **when you change a block type, change every point in the sync set in the same commit.** The canonical set is four capabilities:

1. the **typed schema** (declares the block's fields for the data layer),
2. the **renderer** (a component whose name matches `type`),
3. the **CMS editor schema** (a block-type entry mirroring the fields),
4. the **template query/loader** (selects the block fields).

Drift between any two is the single biggest bug class. The `content-architecture` skill has the per-file checklist; the adapter names the four files for this repo.

---

## 3. E-commerce trust model (capability invariants)

`userId` and money are the two things a client must never be trusted with. Every invariant below is stated against a capability; the adapter names the file that implements it. A finding that reduces to a violation here is HIGH severity.

1. **S1 — Identity comes only from a verified Bearer token.** `userId` enters the system *only* via a verified Authorization-header token, resolved by the **auth verifier** capability. Never read `userId` from the request body, query string, path, or any non-Authorization header.
2. **S2 — Prices are recomputed server-side.** The client cart is display-only. The payment handler builds every charge amount from a **server-side pricing source of truth**, never from amounts echoed in the request body.
3. **S3 — Checkout claim tokens are single-use, TTL-bound, atomically claimed.** The success/confirmation flow is gated by a token that is claimed with a single atomic delete-and-return keyed by `(token, session, not-expired)`. No check-then-delete split; no reuse; no TTL bypass.
4. **S4 — Webhook signatures are verified against the RAW body before parse, then deduped.** The payment webhook verifies the signature against the *unparsed* body before any `JSON.parse`, then records the event id (insert-then-process) so replays are idempotent.
5. **S5 — Row-level security is pinned to the authenticated user.** Per-user rows enforce `owner == authenticated-user-id`. Grants to anonymous/authenticated roles on PII/financial tables use targeted column-level grants, not blanket table grants. New restrictive policies **drop** any pre-existing permissive policy on the same table (policies OR together).
6. **S6 — Secret keys never reach the client bundle.** Service-role/secret keys are server-only. A postbuild scanner greps the produced client bundle for secret names and fails the build on any hit. Only explicitly-public-prefixed env vars may be read in client code.
7. **S7 — Guest→user linking happens only on verified-email transition.** Guest orders are stored with `user_id = NULL`. The only path to linking them to a user is a trigger that fires when the email-confirmation timestamp flips null→set and matches on `lower(email)`. Nothing links user data on unverified email.
8. **S8 — Authored/CMS content is sanitized; every URL/CSS-var/type bind is validated.** CMS-authored HTML renders through an HTML sanitizer with an explicit safe-scheme allowlist. Every CMS-controlled value bound into `href`/`src`/`to`, into a CSS custom property, or into a block-type dispatch is validated at **every** bind site (protocol allowlist / format allowlist / type whitelist).
9. **S9 — Cross-capability money operations are atomic (TOCTOU).** Discount/inventory reservations that read-then-write across the payment and DB capabilities use an atomic reservation (unique-constraint insert, conditional `UPDATE ... WHERE count < max RETURNING`, or a row/advisory lock) — never `SELECT count` then a separate `if`.

The `ecommerce-security-review` skill turns these into a per-file checklist with stable `F-*` IDs and a false-positive suppression list.

---

## 4. Content lifecycle & SEO (capability rules)

- Content files → content transform → typed nodes → generic route creation by `templateKey`. Adding a page type = new template + new CMS collection + content, never a router edit (C-ROUTER-GENERIC).
- Navigation is **derived from content**, not hardcoded: query the content set by type, order by an explicit `navOrder` field, honour a `hidden` flag. Don't hand-maintain a nav array that duplicates content.
- Every page emits SEO metadata from a **single SEO component**: title template, description, Open Graph, Twitter card, canonical URL. Site-wide constants (siteUrl, title, social handles) come from one site-metadata source, not scattered literals.
- Sitemap, robots, and canonical URLs are generated from the same siteUrl. Pre-launch, the non-canonical host is `Disallow: /`.

---

## 5. Design system (hard rules)

The design token set (colour, type scale, spacing, radius, shadow, motion) is defined **once**, as data, and consumed everywhere as tokens. A new brand is a **data change** to the token set, not a rewrite.

- **D-TOKENS-ONLY** — never hardcode a colour hex, font size, or spacing value. Reach for the nearest token. Spacing uses the spacing scale; type uses the type-scale tokens.
- **D-NO-INLINE-STYLE** — no inline `style` for static values; dynamic values only as CSS custom properties, with the visual rule in the stylesheet (see §1).
- **D-BEM** — component styles use BEM (`block__element--modifier`); components compose from the shared class catalog (buttons, cards, sections, grids, forms) rather than bespoke one-off CSS.
- **D-STATE** — every interactive element has a hover **and** focus state using the standard motion tokens.
- **D-CONTAINER-QUERY** — prefer container queries for component responsiveness over viewport media queries.
- **D-THEME** — each block carries a `theme` field; style dark variants under the theme modifier, not duplicated components.
- **D-Z-LAYERS** — overlays follow one stacking convention (a fixed z-index ladder), defined once. Don't invent per-overlay z-indexes.

**Brand-family aesthetic** (carried from the agency house style; adjust per brand): square corners on content blocks/cards/buttons; on card hover change the **border colour**, do not add a drop shadow; adjacent sections always contrast (never stack two same-surface sections without a break); **every page ends with a CTA banner**.

The `design-system` skill scaffolds pages/sections from the composition catalog and emits the token set as a framework-neutral data file.

---

## 6. Database migration discipline (capability rules)

- **DB-NO-HAND-SQL** — every schema change (tables, columns, RLS, grants, triggers, functions) is a migration file applied by the migration CLI. Never hand-run DDL/DML. Manual SQL drifts the schema from the migration history and breaks the sync the CLI relies on.
- **DB-GUARDED-PROD** — there is a **dev** database and a **production** database. A production push is **guarded behind an explicit confirm gate** (an env flag the human must set) and re-checks it is targeting production before applying. A bare "push" that could hit whichever environment is currently linked is banned; use the guarded scripts.
- **DB-DRY-FIRST** — dry-run the production push first and expect the exact pending set before the real push. Apply prod migrations **one at a time with verification between them**, including a data spot-check before adding any `CHECK` constraint.
- **DB-REPAIR-NOT-RERUN** — if a change was already applied out-of-band (schema exists, history has no record), do **not** re-push (it re-runs and fails). Verify the change landed, then record it applied via the CLI's `repair`-style command. Never reset/replay against a database holding real order data.
- **DB-BASELINE-ONCE** — migrations are incremental-only, with one allowed exception: a from-scratch additive baseline used **once** to provision a new environment, then marked applied without re-running.
- **DB-IDEMPOTENT** — write DDL idempotent-friendly (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`) where reasonable, but the canonical apply path is the CLI, not re-runs.

The `db-migration-discipline` skill has the guarded workflow and drift-recovery steps; the adapter names the concrete CLI + scripts.

---

## 7. Conventions worth keeping

- **Query the full block-field union; don't diverge per template** except image sizes (C-FULL-UNION).
- **`type` == renderer name == CMS type name** (C-TYPE-IDENTITY). Any drift becomes the error fallback.
- **Every block has `title` and `theme`** (C-PANEL-SHAPE).
- **Image fields are always `{ url, alt }`** (C-IMAGE-SHAPE).
- **Add content types via the `templateKey` key only** (C-ROUTER-GENERIC).
- **Keep the CMS schema in lock-step with the typed schema** (C-SYNC-DRIFT) — the biggest single source of bugs.
- **Identity from token only; prices server-side only** (S1, S2) — the two rules that keep commerce safe.
- **Migrations via CLI only; production behind a confirm gate** (DB-NO-HAND-SQL, DB-GUARDED-PROD).

---

## Placeholders to fill when assembling a repo CLAUDE.md

`<<BRAND_NAME>>` · `<<PRODUCT_DOMAIN>>` · `<<STACK_NAME>>` · `<<ADAPTER_FILE>>` · `<<DEV_COMMAND>>` · `<<BUILD_COMMAND>>` · `<<SITE_URL>>`

/**
 * Shared types and helpers for the extracted Oxygen block tree.
 * The tree shape is produced by scripts/extract-content.mjs.
 */

export type BlockKind =
  | "section"
  | "columns"
  | "div"
  | "heading"
  | "richtext"
  | "button"
  | "link"
  | "image"
  | "html"
  | "group"
  | "text"
  | "form"
  | "navmenu"
  | "tabs"
  | "spectable"
  | "featurelist";

export interface Background {
  /** Ordered CSS background-image layers, already pointing at local assets. */
  layers: string[];
}

export interface Block {
  kind: BlockKind;
  id?: string;
  className?: string;
  /** The old site lifted this block with a drop shadow; styled as a card. */
  isCard?: boolean;
  wrapClassName?: string;
  bg?: Background | null;
  bgSize?: string | null;
  bgPosition?: string | null;
  level?: number;
  html?: string;
  value?: string;
  href?: string | null;
  label?: string;
  src?: string | null;
  alt?: string;
  width?: string | null;
  height?: string | null;
  tag?: string;
  heading?: string;
  intro?: string;
  /** Content is only a shortcode for a plugin that is not installed. */
  unresolved?: boolean;
  /** Name of an authored table in src/content/tables/. */
  table?: string;
  items?: { label: string; href: string | null; current: boolean }[];
  /** featurelist: the cells of an application grid, and whether it is icon-led. */
  cells?: { label: string; icon: string | null }[];
  icons?: boolean;
  tabs?: {
    id: string;
    label: string;
    className?: string;
    innerId?: string;
    innerClassName?: string;
  }[];
  panels?: { id: string; children: Block[] }[];
  children?: Block[];
}

/**
 * Compose an Oxygen background into one CSS value.
 *
 * Oxygen layers a gradient over the image (it is how the old site darkens its
 * hero photographs), and the order matters: gradient first, image behind.
 * Returned as a value for a CSS custom property rather than an inline style
 * rule, because the URL comes from content and the visual property itself
 * lives in the stylesheet.
 */
export function backgroundValue(bg: Background | null | undefined): string | null {
  if (!bg?.layers?.length) return null;
  return bg.layers.join(", ");
}

/**
 * Guard against the extractor ever emitting executable markup.
 *
 * The event-handler test needs an attribute boundary: matching a bare `on\w+=`
 * anywhere flags ordinary query strings (`?securitycontext=2` contains
 * "ontext="), which silently deletes real page content.
 */
const UNSAFE = [
  /<\s*(script|iframe|object|embed|form)\b/i,
  /(^|[\s"'`])on[a-z]+\s*=/i, // event-handler attribute
  /\b(href|src|action)\s*=\s*["'`]?\s*javascript:/i,
];

export function isSafeHtml(html: string | undefined): boolean {
  return !!html && !UNSAFE.some((re) => re.test(html));
}

/**
 * Block kinds that are data or interaction rather than prose, and so break out
 * of the text measure to the full width of their section: a spec table, the
 * colour tabs, the contact form, a migrated TablePress table, a diagram.
 */
export const WIDE_KINDS = new Set<BlockKind>([
  "spectable",
  "tabs",
  "form",
  "html",
  "image",
  "featurelist",
]);

/**
 * A page, grouped by the extractor into the shape the templates render: a
 * header, a lead, then one section per h2 with its h3s as numbered items (see
 * docs/design-system.md and src/layouts/PageLayout.astro).
 *
 * The content schema types a block as `unknown`, because the Oxygen tree is
 * recursive and deliberately loose about which visual fields appear on which
 * kind, so the route casts to this on the way into the template.
 */
export interface DocSection {
  id: string;
  headline: string;
  body: Block[];
  items: { headline: string; body: Block[] }[];
}

export interface Doc {
  key: string;
  title: string;
  /** The site's own name for the section this page sits in. Never authored. */
  eyebrow: string;
  eyebrowHref: string | null;
  heroImage: string | null;
  supportImage: string | null;
  lead: { headline: string | null; hero: string; body: Block[] };
  sections: DocSection[];
  nav: {
    heading?: string;
    items: { label: string; href: string | null; current: boolean }[];
  } | null;
}

/** Split a body into runs, so each table or form gets the full width and each run of prose its measure. */
export function runsOf(body: Block[]): { wide: boolean; blocks: Block[] }[] {
  const runs: { wide: boolean; blocks: Block[] }[] = [];
  for (const block of body) {
    const wide = WIDE_KINDS.has(block.kind);
    const last = runs.at(-1);
    if (last && last.wide === wide) last.blocks.push(block);
    else runs.push({ wide, blocks: [block] });
  }
  return runs;
}

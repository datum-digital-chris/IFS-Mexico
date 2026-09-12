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
  | "spectable";

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
 * A Mercados page, grouped by the extractor into the section rhythm the
 * template renders (see src/layouts/MarketLayout.astro). The content schema
 * types a block as `unknown` because the tree is recursive and deliberately
 * loose, so the route casts to this on the way into the template.
 */
export interface MarketSection {
  id: string;
  headline: string;
  body: Block[];
  items: { headline: string; body: Block[] }[];
}

export interface Market {
  key: string;
  title: string;
  heroImage: string | null;
  supportImage: string | null;
  lead: { headline: string | null; hero: string; body: Block[] };
  sections: MarketSection[];
  sidebar: {
    heading?: string;
    items: { label: string; href: string | null; current: boolean }[];
  } | null;
}

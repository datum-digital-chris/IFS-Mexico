/**
 * The footer's content, read out of the extracted Oxygen template (post 6).
 *
 * The old footer was a centred stack: a mission statement, the logo, a
 * "Contáctenos" link, the email and the phone. Those four strings are the
 * content; the layout around them is the template's (src/components/Footer.astro).
 * Pulled out here rather than rendered through the block renderer so the footer
 * can be laid out as columns without hand-editing generated content.
 */
import type { Block } from "@/lib/blocks";

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterModel {
  /** The mission statement the old footer opened on. */
  mission: string;
  email: FooterLink | null;
  phone: FooterLink | null;
  copyright: string;
}

const text = (html: string | undefined) =>
  (html ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&copy;/g, "©")
    .replace(/\s+/g, " ")
    .trim();

/** Every block in the tree, depth first. */
function* walk(block: Block | null | undefined): Generator<Block> {
  if (!block) return;
  yield block;
  for (const child of block.children ?? []) yield* walk(child);
}

export function footerOf(root: Block | null | undefined): FooterModel {
  const blocks = [...walk(root)];

  const linkFor = (scheme: string): FooterLink | null => {
    const link = blocks.find((b) => b.href?.startsWith(scheme));
    if (!link?.href) return null;
    // The label is either on the link or in the text block inside it.
    const label =
      text(link.html) ||
      [...walk(link)].map((b) => text(b.html)).find(Boolean) ||
      link.href.slice(scheme.length);
    return { label, href: link.href };
  };

  const paragraphs = blocks
    .filter((b) => b.kind === "richtext" || b.kind === "html")
    .map((b) => text(b.html));

  return {
    mission: paragraphs.find((p) => p.length > 40 && !/^copyright/i.test(p)) ?? "",
    email: linkFor("mailto:"),
    phone: linkFor("tel:"),
    copyright: paragraphs.find((p) => /copyright|©/i.test(p)) ?? "",
  };
}

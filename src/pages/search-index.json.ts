import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { colorSetOf } from "@/lib/colors";
import type { Block, Doc } from "@/lib/blocks";

/**
 * The search index, built at build time from the same content the pages render.
 *
 * Small enough to be one file: 28 pages and 190 RAL swatches. It is fetched
 * once, the first time the palette is opened, so it costs nothing to a visitor
 * who never searches.
 */
interface SearchDoc {
  title: string;
  url: string;
  /** The site's own name for the section, which is what groups the results. */
  type: string;
  description: string;
}

/** Visible text of an extracted block tree, flattened and capped. */
function textOf(blocks: Block[], limit = 400): string {
  const out: string[] = [];
  const walk = (list: Block[]) => {
    for (const block of list) {
      if (block.html) out.push(block.html.replace(/<[^>]+>/g, " "));
      if (block.label) out.push(block.label);
      for (const cell of block.cells ?? []) out.push(cell.label);
      walk(block.children ?? []);
    }
  };
  walk(blocks);
  return out
    .join(" ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

export const GET: APIRoute = async () => {
  const pages = await getCollection("pages");
  const docs: SearchDoc[] = [];

  for (const page of pages) {
    const doc = page.data.doc as Doc | undefined;
    if (!doc) continue;
    docs.push({
      title: doc.title,
      url: page.data.path,
      type: doc.eyebrow || "Página",
      // The standfirst, then the opening passage and the section headings: what
      // a page is about is in those three, and nothing else is worth the bytes.
      description: [
        doc.lead.hero,
        textOf(doc.lead.body, 300),
        doc.sections.map((s) => s.headline).join(" · "),
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 500),
    });

    // Every RAL swatch is its own result: "5010" is the most likely thing
    // anyone types into a coatings site's search box.
    if (page.data.slug === "colors") {
      for (const group of colorSetOf(doc.lead.body).groups) {
        for (const swatch of group.swatches) {
          docs.push({
            title: swatch.name,
            url: `${page.data.path}#${swatch.name.toLowerCase().replace(/\s+/g, "-")}`,
            type: "Color",
            description: `${swatch.code} · ${group.label}`,
          });
        }
      }
    }
  }

  return new Response(JSON.stringify(docs), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};

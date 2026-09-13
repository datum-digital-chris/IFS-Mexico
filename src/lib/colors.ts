/**
 * The RAL swatches on /colors/, read out of the extracted page.
 *
 * Oxygen rendered them as three tab panels of 4-across image columns, split
 * "RAL Colors 1/2/3" — a division that carries no meaning: the split is simply
 * where the first panel got long. The 190 swatches are really one set with a
 * natural order, the RAL classic families, so they are regrouped here.
 *
 * Nothing is added or dropped: every swatch keeps its image, its RAL number and
 * its IFS code, and `npm run compare` checks the codes still appear. The group
 * names are the RAL families' own, which is the only authored text on the page.
 */
import type { Block } from "@/lib/blocks";

export interface Swatch {
  /** "RAL 1000". */
  name: string;
  /** "IFS Code 1: PLSF40705", verbatim - it is the product reference. */
  code: string;
  image: string | null;
}

export interface ColorGroup {
  /** First digit of the RAL number, which is what defines the family. */
  key: string;
  id: string;
  label: string;
  /** A representative colour for the family, for the chip and the code pill.
      Content, not palette: it identifies a RAL family the way the swatch
      photographs do, and is not part of the design token set. */
  hex: string;
  swatches: Swatch[];
}

/** The RAL classic families, in RAL's own order. */
const FAMILIES: { key: string; id: string; label: string; hex: string }[] = [
  { key: "1", id: "amarillos", label: "Amarillos", hex: "#e5be01" },
  { key: "2", id: "naranjas", label: "Naranjas", hex: "#de5307" },
  { key: "3", id: "rojos", label: "Rojos", hex: "#a72920" },
  { key: "4", id: "violetas", label: "Violetas", hex: "#7b4a7f" },
  { key: "5", id: "azules", label: "Azules", hex: "#1f5799" },
  { key: "6", id: "verdes", label: "Verdes", hex: "#2e6f40" },
  { key: "7", id: "grises", label: "Grises", hex: "#7e7e7e" },
  { key: "8", id: "marrones", label: "Marrones", hex: "#6b4534" },
  { key: "9", id: "blancos-y-negros", label: "Blancos y negros", hex: "#3a3a3a" },
];

const ENTITIES: Record<string, string> = {
  amp: "&",
  nbsp: " ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  reg: "®",
};

/** The visible lines of a fragment of extracted HTML, in order. */
function lines(html: string | undefined): string[] {
  return (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function findTabs(blocks: Block[]): Block | null {
  for (const block of blocks) {
    if (block.kind === "tabs") return block;
    const hit = findTabs(block.children ?? []);
    if (hit) return hit;
  }
  return null;
}

/** One swatch, from the div Oxygen wrapped its image, number and code in. */
function swatchOf(cell: Block): Swatch | null {
  const kids = cell.children ?? [];
  const name = lines(kids.find((k) => k.kind === "heading")?.html)[0];
  const code = lines(kids.find((k) => k.kind === "richtext")?.html)[0];
  if (!name || !code) return null;
  return { name, code, image: kids.find((k) => k.kind === "image")?.src ?? null };
}

export interface ColorSet {
  groups: ColorGroup[];
  /** The line the old page repeated above each tab panel. */
  notes: string[];
  total: number;
}

/**
 * Regroup the tabbed swatches by RAL family.
 *
 * Returns empty rather than throwing if the page stops matching this shape: a
 * re-extraction that changed it should show as an empty colour page in review,
 * not as a build that fails with no clue which page broke. The caller warns.
 */
export function colorSetOf(body: Block[]): ColorSet {
  const tabs = findTabs(body);
  const cells: Block[] = [];
  const notes: string[] = [];

  for (const panel of tabs?.panels ?? []) {
    for (const child of panel.children ?? []) {
      if (child.kind === "columns") cells.push(...(child.children ?? []));
      else if (child.kind === "richtext") notes.push(...lines(child.html));
    }
  }

  const swatches = cells.map(swatchOf).filter((s): s is Swatch => s !== null);
  const groups = FAMILIES.map((family) => ({
    ...family,
    swatches: swatches.filter((s) => /^RAL (\d)/.exec(s.name)?.[1] === family.key),
  })).filter((group) => group.swatches.length > 0);

  return { groups, notes: [...new Set(notes)], total: swatches.length };
}

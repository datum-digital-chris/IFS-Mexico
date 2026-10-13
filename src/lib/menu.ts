import site from "@/content/site.json";

/**
 * The menu section a page belongs to, as PageNav items: every sibling, with
 * the page itself marked current so the band can leave it out.
 */
export function sectionNav(
  section: string,
  path: string,
): { heading: string; items: { label: string; href: string | null; current: boolean }[] } {
  const parent = site.menu.find((m) => m.label === section);
  const items = (parent?.children ?? []).map((c) => ({
    label: c.label,
    href: c.href,
    current: c.href === path,
  }));
  return { heading: section, items };
}

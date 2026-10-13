import type { APIRoute } from "astro";

/**
 * robots.txt, from the same site URL the sitemap and canonicals use.
 *
 * Only a production build on the canonical host is crawlable. Before
 * go-live the site URL is the netlify.app address, so everything is
 * disallowed; once ifscoatings.mx is attached it opens up with no change here.
 * Netlify gives deploy previews and branch deploys the primary URL too, so
 * the deploy context is checked as well (CONTEXT is unset off Netlify).
 */
const CANONICAL_HOST = "ifscoatings.mx";

export const GET: APIRoute = ({ site }) => {
  const host = site?.host.replace(/^www\./, "");
  const context = process.env.CONTEXT ?? "production";
  const body =
    host === CANONICAL_HOST && context === "production"
      ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site).href}\n`
      : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};

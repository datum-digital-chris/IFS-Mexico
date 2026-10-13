import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // Netlify sets URL to the site's primary address, so this follows go-live
  // automatically once the domain is attached; the fallback is staging.
  site: process.env.URL ?? "https://ifs-mexico.netlify.app",

  // WordPress served trailing-slash URLs and every redirect targets that form.
  trailingSlash: "always",

  build: { inlineStylesheets: "always" },

  // The form confirmation pages are noindex, so listing them would contradict
  // themselves.
  integrations: [sitemap({ filter: (page) => !/\/(gracias|descarga)\/$/.test(page) })],

  vite: {
    plugins: [tailwindcss()],
    // Serve every script as a file rather than inlining the small ones, so the
    // Content-Security-Policy in netlify.toml can be `script-src 'self'`
    // without a hash per page.
    build: { assetsInlineLimit: 0 },
  },
});

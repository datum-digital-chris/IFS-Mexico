# Astro

Astro 6 patterns: content collections, islands, and static output.

Astro 6 has been the stable release since March 2026. Write new projects against
it. The Astro 5 differences that break silently are flagged below.

## Ship Zero JavaScript by Default

Astro renders components to HTML at build time and ships no JavaScript unless
you ask for it. This is the whole point of the framework — treat every
`client:*` directive as a cost you have chosen to pay.

- Default to no directive. A component with no `client:*` is static HTML.
- `client:load` — hydrate immediately. Reserve for above-the-fold interactivity.
- `client:idle` — hydrate when the browser is idle.
- `client:visible` — hydrate when scrolled into view. The right default for
  anything below the fold.
- `client:media={query}` — hydrate only at a breakpoint.
- `client:only="react"` — skip SSR entirely; the framework name is required.

```astro
---
import Carousel from '../components/Carousel.jsx'
import StaticNav from '../components/StaticNav.astro'
---
<StaticNav />
<Carousel client:visible />
```

Do not reach for a UI framework for something `.astro` can do. A component that
renders markup and never handles an event should be `.astro`.

## Routing

- File-based, from `src/pages/`. `src/pages/about.astro` serves `/about`.
- `[slug].astro` for dynamic routes; `[...path].astro` for rest params.
- A static route needs `getStaticPaths()` returning `{ params, props }`.
- `src/pages/404.astro` is the not-found page.
- Layouts live in `src/layouts/`, components in `src/components/`.

```astro
---
// src/pages/services/[slug].astro
import { getCollection, render } from 'astro:content'

export async function getStaticPaths() {
  const services = await getCollection('services')
  return services.map((entry) => ({ params: { slug: entry.id }, props: { entry } }))
}

const { entry } = Astro.props
const { Content } = await render(entry)
---
<h1>{entry.data.title}</h1>
<Content />
```

## Content Collections

Collections are declared in **`src/content.config.ts`** — at the root of `src/`,
not inside `src/content/`. Each collection names a loader.

```typescript
// src/content.config.ts
import { defineCollection, z } from 'astro/zod'
import { glob } from 'astro/loaders'

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
})

export const collections = { services }
```

- Define a schema for every collection. It is the only thing standing between a
  CMS editor and a broken build, and it fails at build time rather than in
  production.
- Query with `getCollection('name')` and `getEntry('name', id)`.
- Filter drafts in the query, not the template:
  `getCollection('services', ({ data }) => !data.draft)`.
- Reference other collections with `reference('authors')` rather than raw
  string ids.

### Astro 5 → 6 traps

These fail quietly or confusingly, so check them first when a migration breaks:

- **`src/content/config.ts` is not read.** Astro 6 ignores both it and the
  `legacy.collections` flag. The file must be `src/content.config.ts`.
- **`entry.slug` is gone.** Content Layer entries expose `entry.id`. Code that
  built URLs from `slug` produces `undefined` in the path, not an error.
- **`entry.render()` is gone.** Import `render` from `astro:content` and call
  `render(entry)`.
- **Zod 4.** Import `z` from `astro/zod`, not from a separately installed `zod`.
- **Node 22 or later.** Astro 6 dropped Node 18 and 20; pin this in CI and in
  the host's build image or the build fails only on the remote.

### Live collections

For content that must update without a rebuild, `defineLiveCollection()` in
`src/live.config.ts` fetches at request time. This requires an SSR adapter — do
not reach for it on a static site just to avoid a two-minute build.

## Images

Use `astro:assets`. It handles dimensions, format conversion and lazy loading,
and it prevents layout shift by knowing the intrinsic size at build time.

```astro
---
import { Image } from 'astro:assets'
import hero from '../assets/hero.jpg'
---
<Image src={hero} alt="Furnace relining in progress" widths={[400, 800, 1200]} />
```

- Import images from `src/` so they are optimized and hashed. Files in
  `public/` are copied verbatim and are not processed.
- `alt` is required and enforced. Write real alternative text; an empty string
  is correct only for decorative images.
- Prefer `<Image>` over a bare `<img>` unless the source is a remote URL not
  configured in `image.domains` / `image.remotePatterns`.

## Fonts

Astro 6 ships a built-in Fonts API that downloads, caches, subsets and preloads
fonts and generates fallback metrics. Use it rather than hand-rolling
`@font-face` and preload tags — the generated fallbacks are what stop the
layout shifting as a webfont swaps in.

## Output Mode

- `output: 'static'` is the default and the right choice for a content site.
- Add an adapter and `output: 'server'` only when something genuinely needs
  request-time rendering. A contact form does not: post it to a form handler or
  a serverless function and keep the pages static.
- `prerender = false` opts a single route into SSR without converting the site.

## Content Security Policy

Astro 6 has stable built-in CSP that hashes its own scripts and styles. Enable
it rather than writing header rules by hand, which drift the moment a component
adds an inline style.

## Related Patterns

- Accessibility: [../02-frontend/accessibility.md](../02-frontend/accessibility.md)
- Styling: [../02-frontend/styling.md](../02-frontend/styling.md)
- Netlify: [../05-platforms/netlify.md](../05-platforms/netlify.md)
- Decap CMS: [../05-platforms/decap-cms.md](../05-platforms/decap-cms.md)
- TypeScript: [../01-language/typescript.md](../01-language/typescript.md)
- Build tools: [../06-tools/build-tools.md](../06-tools/build-tools.md)

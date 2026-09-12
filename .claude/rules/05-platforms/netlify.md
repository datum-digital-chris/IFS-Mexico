# Netlify

Netlify Functions, Edge Functions, and deployment patterns.

## Functions

### Serverless Functions
- Place in `netlify/functions/`
- Use latest format with `export default`
- Use TypeScript (`.mts`) for ES modules

```typescript
import type { Context, Config } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  return new Response('Hello World')
}

export const config: Config = {
  path: '/hello-world'
}
```

### Edge Functions
- Place in `netlify/edge-functions/`
- Use Deno runtime
- Run at edge for low latency

```typescript
import type { Context, Config } from '@netlify/edge-functions'

export default async (req: Request, context: Context) => {
  const response = await context.next()
  // Modify response
  return response
}

export const config: Config = {
  path: '/api/*'
}
```

## Storage

### Netlify Blobs
- Use for object storage
- No configuration needed
- Use `getStore()` for global, `getDeployStore()` for deploy-specific

```typescript
import { getStore } from '@netlify/blobs'

const store = getStore('my-store')
await store.set('key', 'value')
const value = await store.get('key')
```

## Environment Variables

### Management
- Set via Netlify UI or CLI
- Use `Netlify.env.get()` in functions
- Never commit secrets

```typescript
const apiKey = Netlify.env.get('API_KEY')
```

## Best Practices

### Function Organization
- One function per file
- Use subdirectories for organization
- Name entry file `index.mts` in subdirectories

### Error Handling
- Return appropriate status codes
- Provide clear error messages
- Log errors for debugging

## Related Patterns

- Astro: [../04-frameworks/astro.md](../04-frameworks/astro.md)
- Decap CMS: [decap-cms.md](decap-cms.md)
- Node.js: [../03-backend/nodejs.md](../03-backend/nodejs.md)
- API design: [../03-backend/api-design.md](../03-backend/api-design.md)
- Error handling: [../00-core/error-handling.md](../00-core/error-handling.md)
- TypeScript: [../01-language/typescript.md](../01-language/typescript.md)

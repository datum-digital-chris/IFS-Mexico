# TypeScript

TypeScript configuration, type safety, and essential patterns.

## Configuration

### Strict Mode
- Enable `strict: true` in `tsconfig.json`
- Enable `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`
- Use `skipLibCheck: true` for faster compilation
- Set appropriate `target` and `module` for your environment

### Recommended Settings
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "skipLibCheck": true
  }
}
```

## Type Definitions

### Interfaces vs Types
- Prefer `interface` for object shapes (extendable, mergeable)
- Use `type` for unions, intersections, and computed types
- Use `type` for primitives and simple aliases

### Example
```typescript
// Prefer interface for objects
interface User {
  id: string
  name: string
  email: string
}

// Use type for unions
type Status = 'pending' | 'approved' | 'rejected'

// Use type for computed types
type UserKeys = keyof User
```

## Type Safety

### MUST: Use `unknown` for Untrusted Input
- **MUST** use `unknown` (not `any`) for untrusted input + narrow via validation
- Never use `any` unless absolutely necessary
- Use type assertions sparingly (`as` or `!`)
- Prefer type guards over assertions

### Type Guards
```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  )
}

// At API boundary - validate unknown input
function processRequest(body: unknown) {
  if (!isUser(body)) {
    throw new ValidationError('Invalid user data')
  }
  // body is now typed as User
  return processUser(body)
}
```

## Function Types

### SHOULD: Explicit Return Types
- **SHOULD** add explicit return types on exported/public APIs
- Define return types for all functions
- Use `void` for functions that don't return
- Use `Promise<T>` for async functions

### Example
```typescript
// Public API - explicit return type required
export function getUser(id: string): Promise<User | null> {
  // implementation
}

// Internal function - return type optional but recommended
function processData(data: Data): void {
  // implementation
}
```

## Generics

- Use generics for reusable, type-safe functions
- Provide default type parameters when appropriate
- Use constraints to limit generic types

```typescript
function getById<T extends { id: string }>(
  items: T[],
  id: string
): T | undefined {
  return items.find(item => item.id === id)
}
```

## Utility Types

- Use `Partial<T>` for optional properties
- Use `Pick<T, K>` to select properties
- Use `Omit<T, K>` to exclude properties
- Use `Readonly<T>` for immutable types

## MUST: Avoid Enums

- **MUST** avoid `enum` in services/libs (prefer string literal unions / `as const`)
- Use const objects with `as const` for fixed sets of values
- Use union types for type safety

```typescript
// Bad: enum
enum Status {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// Good: const object with union type
const Status = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

type Status = typeof Status[keyof typeof Status]
// Result: 'pending' | 'approved' | 'rejected'
```

## Related Patterns

- Advanced TypeScript: [typescript-advanced.md](typescript-advanced.md)
- JavaScript basics: [javascript.md](javascript.md)
- React TypeScript: [../02-frontend/react-core.md](../02-frontend/react-core.md)
- Code style: [../00-core/code-style.md](../00-core/code-style.md)
- Error handling: [../00-core/error-handling.md](../00-core/error-handling.md)
- Security (boundary validation): [../00-core/security.md](../00-core/security.md)
- Backend validation: [../03-backend/validation.md](../03-backend/validation.md) (if applicable)
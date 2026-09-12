# TypeScript Advanced

Advanced TypeScript patterns for complex type scenarios.

## Advanced Types

### Discriminated Unions
Use for type-safe state machines and variant types:

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string }

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    // TypeScript knows result.data exists
    return result.data
  }
  // TypeScript knows result.error exists
  throw new Error(result.error)
}
```

### Mapped Types
Create types by transforming properties:

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}

type Optional<T> = {
  [P in keyof T]?: T[P]
}
```

### Conditional Types
Types that depend on other types:

```typescript
type NonNullable<T> = T extends null | undefined ? never : T

type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never
```

## Generic Constraints

### Advanced Constraints
```typescript
// Constrain to object with specific property
function hasProperty<T extends { id: string }>(
  obj: T,
  key: keyof T
): boolean {
  return key in obj
}

// Multiple constraints
function merge<T extends object, U extends object>(
  a: T,
  b: U
): T & U {
  return { ...a, ...b }
}
```

## Type Inference

### `infer` Keyword
Extract types from other types:

```typescript
type ArrayElement<T> = T extends (infer U)[] ? U : never

type FirstArg<T> = T extends (arg: infer U) => any ? U : never
```

## Template Literal Types

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`

type ApiEndpoint = `api/${string}`

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type ApiRoute<M extends HttpMethod> = `${M} /${string}`
```

## Branded Types

Create distinct types from primitives:

```typescript
type UserId = string & { readonly brand: unique symbol }
type ProductId = string & { readonly brand: unique symbol }

function createUserId(id: string): UserId {
  return id as UserId
}
```

## Utility Type Patterns

### Deep Readonly
```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P]
}
```

### Deep Partial
```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
```

## Type Narrowing

### Control Flow Analysis
TypeScript narrows types based on control flow:

```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    // value is string here
    return value.toUpperCase()
  }
  // value is number here
  return value.toFixed(2)
}
```

## Related Patterns

- TypeScript basics: [typescript.md](typescript.md)
- React with TypeScript: [../02-frontend/react-core.md](../02-frontend/react-core.md#typescript)

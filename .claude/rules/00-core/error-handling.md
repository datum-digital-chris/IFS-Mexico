# Error Handling

Comprehensive error handling patterns for robust applications.

## Core Principles

- Validate inputs and preconditions early (guard clauses)
- Place happy-path logic last
- Provide clear, user-friendly error messages
- Log unexpected errors with context
- Never silently swallow errors

## Error Handling Patterns

### Early Returns and Guard Clauses

```typescript
function processUser(user: User | null): Result {
  if (!user) {
    return { error: 'User not found' }
  }
  if (!user.isActive) {
    return { error: 'User account is inactive' }
  }
  // Happy path
  return { data: processActiveUser(user) }
}
```

### Error Types

- **Expected errors**: Return error values, don't throw
- **Unexpected errors**: Throw exceptions, catch at boundaries
- **Validation errors**: Return structured error objects
- **System errors**: Log and throw, handle at top level

### React/Next.js Patterns

- Use error boundaries for unexpected errors (`error.tsx`, `global-error.tsx`)
- Model expected errors as return values in Server Actions
- Use `useActionState` for form validation errors
- Never use try/catch for expected errors in Server Actions

### Node.js/API Patterns

- Use consistent error response format
- Include error codes for programmatic handling
- Provide user-friendly messages
- Log detailed errors server-side only

### Error Response Format

```typescript
type ErrorResponse = {
  code: string
  message: string
  details?: unknown
}
```

## Validation

- Validate at boundaries (API endpoints, form inputs)
- Use schema validation (Zod, Joi) for runtime validation
- Separate client-side and server-side validation
- Never trust client-side validation alone

## Logging

- Log errors with sufficient context (user ID, request ID, stack trace)
- Use appropriate log levels (error, warn, info, debug)
- Never log sensitive data (passwords, tokens, PII)
- Include correlation IDs for distributed tracing
- See [observability.md](observability.md) for structured logging standards

## Related Patterns

- Observability: [observability.md](observability.md)
- Security (logging hygiene): [security.md](security.md)
- TypeScript error types: [../01-language/typescript.md](../01-language/typescript.md#error-types)
- React error boundaries: [../02-frontend/react-core.md](../02-frontend/react-core.md#error-boundaries)
- API error responses: [../03-backend/api-design.md](../03-backend/api-design.md#error-handling)

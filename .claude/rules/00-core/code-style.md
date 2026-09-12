# Code Style

Universal coding style and naming conventions applicable across all languages and frameworks.

## Naming Conventions

### Variables and Functions

- Use `camelCase` for variables, functions, and methods
- Use descriptive names with auxiliary verbs for booleans: `isLoading`, `hasError`, `canDelete`, `shouldRender`
- Start function names with verbs: `getUserData`, `createAccount`, `validateInput`
- Use complete words, avoid abbreviations (except standard ones: API, URL, ID)

### Components and Types

- Use `PascalCase` for components, classes, and types
- Use `UPPERCASE` for constants and environment variables
- Use `kebab-case` for file and directory names: `user-profile.tsx`, `components/auth-wizard/`

### Files

- Components: `.tsx` (React), `.vue` (Vue), `.svelte` (Svelte)
- Utilities/Hooks: `.ts`
- Style modules: `.module.scss` or `.module.css`
- Types: `.type.ts` or define inline
- Tests: `.test.ts` or `.spec.ts`

## Formatting

### Indentation and Spacing

- Use 2 spaces for indentation (consistent across project)
- Add space after keywords: `if (condition)`, `for (item)`
- Add space before function parentheses: `function name ()`
- Space infix operators: `a + b`, `x === y`
- Space after commas in arrays/objects

### Braces and Semicolons

- Use curly braces for multi-line blocks
- Omit semicolons unless required for disambiguation
- Keep `else` on same line as closing brace: `} else {`
- Use single quotes for strings (except to avoid escaping)

### Equality

- Always use strict equality: `===` and `!==`
- Never use loose equality: `==` and `!=`

## Code Structure

### Function Organization

- Place exported component/function first
- Follow with subcomponents/helpers
- Place types at the end
- Group related code together

### Imports

- Group imports: external libraries → internal modules → relative imports
- Use named exports for components and utilities
- Use `import type` for type-only imports

### Comments

- Write self-documenting code (prefer code clarity over comments)
- Add comments only for complex business logic
- Use JSDoc for public APIs
- Keep comments up-to-date with code changes

## Best Practices

- Use early returns to reduce nesting
- Extract complex logic into named functions
- Avoid deep nesting (max 3-4 levels)
- Use guard clauses for preconditions
- Place happy path logic last

## Related Patterns

- Development principles: [development-principles.md](development-principles.md)
- File organization: [file-organization.md](file-organization.md)
- TypeScript specifics: [../01-language/typescript.md](../01-language/typescript.md)

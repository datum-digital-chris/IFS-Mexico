# Linting and Formatting

Code quality tools and configuration.

## ESLint

### Configuration
- Use TypeScript ESLint parser for TS projects
- Extend recommended configs
- Add React plugin for React projects
- Configure rules for your team's preferences

### Common Rules
- `no-unused-vars` - Catch unused variables
- `@typescript-eslint/no-explicit-any` - Prevent `any` usage
- `react-hooks/rules-of-hooks` - Enforce hooks rules
- `prefer-const` - Use const when possible

## Prettier

### Configuration
- Use consistent formatting across team
- Configure in `.prettierrc` or `package.json`
- Set print width (80 or 100)
- Use trailing commas

### Integration
- Integrate with ESLint
- Format on save in IDE
- Run in pre-commit hooks

## Standard.js

### When to Use
- Simple JavaScript projects
- Pre-configured rules
- No semicolons, 2 spaces, single quotes

### Rules
- 2-space indentation
- Single quotes (except to avoid escaping)
- No semicolons
- Always use `===` / `!==`
- Space after keywords

## EditorConfig

### Configuration
- Use `.editorconfig` for cross-editor consistency
- Set indentation, line endings, charset
- Apply to all file types

## Pre-commit Hooks

### Husky + lint-staged
- Run linter on staged files
- Run formatter on staged files
- Prevent commits with errors

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

## Related Patterns

- Code style: [../00-core/code-style.md](../00-core/code-style.md)
- TypeScript: [../01-language/typescript.md](../01-language/typescript.md)
- Development principles: [../00-core/development-principles.md](../00-core/development-principles.md)

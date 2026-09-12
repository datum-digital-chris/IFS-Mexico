# File Organization

Standard file and directory organization patterns for maintainable codebases.

## Directory Structure

### General Principles
- Use `kebab-case` for all directory names
- Group by feature/domain when possible
- Keep related files together
- Separate concerns (components, utilities, types)

### Common Patterns

#### Feature-Based Structure
```
features/
  auth/
    components/
    hooks/
    utils/
    types.ts
  dashboard/
    components/
    hooks/
    utils/
    types.ts
```

#### Layer-Based Structure
```
src/
  components/
  hooks/
  utils/
  types/
  services/
  api/
```

## File Naming

- Components: `PascalCase.tsx` or `kebab-case.tsx` (match project convention)
- Utilities: `kebab-case.ts`
- Hooks: `use-kebab-case.ts` or `useKebabCase.ts`
- Types: `kebab-case.type.ts` or inline
- Tests: `kebab-case.test.ts` or `kebab-case.spec.ts`
- Config: `kebab-case.config.ts`

## File Contents Organization

### Standard Order
1. Imports (external → internal → relative)
2. Exported component/function
3. Subcomponents/helpers
4. Types
5. Constants

### Example Structure
```typescript
// Imports
import { useState } from 'react'
import { Button } from '@/components/ui'

// Exported component
export function UserProfile({ userId }: UserProfileProps) {
  // Component logic
}

// Subcomponents
function ProfileHeader() { }

// Types
type UserProfileProps = {
  userId: string
}
```

## Module Organization

- One primary export per file
- Use named exports for utilities
- Use default exports for components (if project convention)
- Co-locate related files (component + styles + tests)

## Related Patterns

- Code style: [code-style.md](code-style.md)
- React structure: [../02-frontend/react-core.md](../02-frontend/react-core.md#file-organization)
- Node.js structure: [../03-backend/nodejs.md](../03-backend/nodejs.md#project-structure)

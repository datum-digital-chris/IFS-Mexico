# Styling

Styling approaches and design system patterns.

## Tailwind CSS

### Utility-First Approach
- Use utility classes for styling
- Prefer utilities over custom CSS
- Use mobile-first responsive design
- Leverage Tailwind's design tokens

### Configuration
- Extend theme in `tailwind.config.js`
- Use CSS variables for dynamic theming
- Configure content paths correctly

### Best Practices
- Use `cn()` utility for conditional classes
- Group related utilities logically
- Use arbitrary values sparingly
- Prefer Tailwind classes over inline styles

```typescript
import { cn } from '@/lib/utils'

function Button({ variant, className }: Props) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded',
        variant === 'primary' && 'bg-blue-500 text-white',
        className
      )}
    >
      Click
    </button>
  )
}
```

## SCSS Modules

### Co-location
- Place `.module.scss` next to component
- Use camelCase or BEM for class names
- Import as namespace

### Structure
```scss
// variables.scss
$primary-color: #3b82f6;
$spacing: 1rem;

// component.module.scss
@import 'variables';

.button {
  padding: $spacing;
  background: $primary-color;

  &:hover {
    opacity: 0.9;
  }
}
```

## Component Libraries

### Shadcn UI
- Install components with CLI: `npx shadcn@latest add button`
- Customize via CSS variables
- Copy components to your codebase (not a dependency)

### Radix UI
- Use for accessible primitives
- Unstyled, fully customizable
- Excellent accessibility out of the box

## Design Systems

### Color System
- Use semantic color names (primary, secondary, destructive)
- Define in CSS variables for theming
- Support light/dark modes

### Spacing Scale
- Use consistent spacing scale (4px, 8px, 16px, etc.)
- Apply via Tailwind spacing or SCSS variables

### Typography
- Define type scale consistently
- Use semantic HTML for headings
- Ensure readable line heights

## Responsive Design

### Mobile-First
- Design for mobile first
- Use Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Test on real devices

### Breakpoints
```typescript
// Mobile first approach
<div className="
  p-4          // Mobile: padding 1rem
  md:p-6       // Tablet+: padding 1.5rem
  lg:p-8       // Desktop+: padding 2rem
">
```

## Dark Mode

### Implementation
- Use CSS variables for theme colors
- Toggle via class or data attribute
- Support system preference

```typescript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media'
  // ...
}
```

## Related Patterns

- Accessibility: [accessibility.md](accessibility.md)
- React components: [react-core.md](react-core.md)
- Next.js: [nextjs.md](nextjs.md)
- Code style: [../00-core/code-style.md](../00-core/code-style.md)

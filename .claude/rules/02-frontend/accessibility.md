# Accessibility

Web accessibility standards and implementation patterns.

## Core Requirements

### Semantic HTML
- Use semantic elements (`<nav>`, `<main>`, `<article>`, `<section>`)
- Use proper heading hierarchy (h1 → h2 → h3)
- Use lists for list content
- Use buttons for actions, links for navigation

### ARIA Attributes
- Use ARIA labels when text isn't visible
- Use `aria-describedby` for additional context
- Use `aria-live` for dynamic content updates
- Use `role` attributes when semantic HTML isn't sufficient

### Keyboard Navigation
- Ensure all interactive elements are keyboard accessible
- Provide visible focus indicators
- Maintain logical tab order
- Support keyboard shortcuts where appropriate

## Form Accessibility

### Labels
- Associate labels with inputs using `htmlFor`/`id`
- Provide clear, descriptive labels
- Use `aria-describedby` for error messages

```typescript
<label htmlFor="email">Email address</label>
<input
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid={hasError}
/>
{hasError && (
  <span id="email-error" role="alert">
    Please enter a valid email
  </span>
)}
```

### Error Handling
- Announce errors to screen readers
- Use `role="alert"` for error messages
- Associate errors with inputs
- Provide clear, actionable error messages

## Images

### Alt Text
- Provide descriptive alt text for informative images
- Use empty alt (`alt=""`) for decorative images
- Describe content, not appearance

### Decorative Images
```typescript
<img src="decoration.jpg" alt="" aria-hidden="true" />
```

## Color and Contrast

### Contrast Ratios
- Text: minimum 4.5:1 for normal text, 3:1 for large text
- Interactive elements: minimum 3:1 contrast
- Don't rely on color alone to convey information

### Color Blindness
- Use patterns, icons, or text in addition to color
- Test with color blindness simulators

## Focus Management

### Visible Focus
- Ensure focus indicators are visible
- Don't remove outline without providing alternative
- Use `:focus-visible` for keyboard-only focus

### Focus Order
- Maintain logical tab order
- Use `tabIndex` sparingly (prefer DOM order)
- Manage focus for modals and dynamic content

## Screen Readers

### Announcements
- Use `aria-live` regions for dynamic updates
- Use `role="status"` for non-critical updates
- Use `role="alert"` for important messages

### Hidden Content
- Use `aria-hidden="true"` for decorative content
- Use `.sr-only` class for visually hidden but accessible text

## Testing

### Tools
- Use axe DevTools or WAVE for automated testing
- Test with keyboard navigation
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Validate HTML structure

### Manual Testing
- Navigate entire app with keyboard only
- Test with screen reader
- Verify color contrast
- Check focus indicators

## Related Patterns

- React components: [react-core.md](react-core.md)
- Error handling: [../00-core/error-handling.md](../00-core/error-handling.md)
- Styling: [styling.md](styling.md)
- Forms: [react-state.md](react-state.md#form-state)

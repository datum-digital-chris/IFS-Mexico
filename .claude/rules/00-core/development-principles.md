# Development Principles

Core software engineering principles that apply to all code regardless of technology stack.

## SOLID Principles

- **Single Responsibility**: Each function, class, or module should have one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable for their base classes
- **Interface Segregation**: Clients should not depend on interfaces they don't use
- **Dependency Inversion**: Depend on abstractions, not concretions

## DRY (Don't Repeat Yourself)

- Extract repeated logic into reusable functions or modules
- Use loops and helper functions instead of duplicate code
- Create shared utilities for common operations
- Avoid copy-paste programming

## Clean Code Principles

- Write code that is readable and self-documenting
- Use descriptive names that reveal intent
- Keep functions small and focused (ideally < 20 lines)
- Prefer composition over inheritance
- Write code for humans first, machines second

## Functional Programming Patterns

- Prefer functional and declarative patterns over imperative
- Use pure functions when possible (no side effects)
- Leverage higher-order functions (map, filter, reduce)
- Avoid mutable state where possible
- Use immutability for data structures

## Code Organization

- Group related functionality together
- Separate concerns (business logic, data access, presentation)
- Use modular architecture
- Keep dependencies unidirectional
- Structure files: exports → implementation → helpers → types

## Related Patterns

- Code style: [code-style.md](code-style.md)
- File organization: [file-organization.md](file-organization.md)
- Error handling: [error-handling.md](error-handling.md)

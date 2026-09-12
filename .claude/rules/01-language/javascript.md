# JavaScript

Modern JavaScript best practices and patterns.

## ES6+ Features

### Use Modern Syntax
- Prefer `const` for immutable values, `let` for mutable
- Use arrow functions for callbacks and short functions
- Use template literals for string interpolation
- Use destructuring for object/array access
- Use spread operator for arrays and objects
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### Avoid Legacy Patterns
- Don't use `var` (use `const` or `let`)
- Don't use `function` keyword for callbacks (use arrow functions)
- Avoid `for...in` loops (use `for...of` or array methods)

## Async Programming

### Promises and Async/Await
- Prefer `async/await` over promise chains
- Use `Promise.all()` for parallel operations
- Use `Promise.allSettled()` when you need all results
- Handle errors with try/catch in async functions

### Example Patterns
```javascript
// Parallel operations
const [user, posts] = await Promise.all([
  fetchUser(userId),
  fetchPosts(userId)
])

// Sequential with error handling
try {
  const user = await fetchUser(userId)
  const posts = await fetchUserPosts(user.id)
  return { user, posts }
} catch (error) {
  logger.error('Failed to fetch user data', { userId, error })
  throw error
}
```

## Array Methods

- Use `map()` for transformations
- Use `filter()` for filtering
- Use `reduce()` for aggregations
- Use `find()` instead of `filter()[0]`
- Use `some()` and `every()` for boolean checks
- Prefer array methods over loops when appropriate

## Object Patterns

- Use object destructuring for function parameters
- Use object spread for immutability
- Use computed property names when needed
- Prefer object shorthand: `{ name }` instead of `{ name: name }`

## Functions

- Use arrow functions for callbacks and short functions
- Use `function` keyword for hoisted functions or when `this` binding matters
- Use default parameters instead of `||` fallbacks
- Use rest parameters for variadic functions

## Related Patterns

- TypeScript: [typescript.md](typescript.md)
- Error handling: [../00-core/error-handling.md](../00-core/error-handling.md)
- Code style: [../00-core/code-style.md](../00-core/code-style.md)
- Development principles: [../00-core/development-principles.md](../00-core/development-principles.md)

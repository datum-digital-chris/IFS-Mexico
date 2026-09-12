# Build Tools

Bundling, transpilation, and build optimization.

## Vite

### Configuration
- Fast HMR for development
- Optimized production builds
- Plugin ecosystem
- TypeScript support out of the box

### Optimization
- Automatic code splitting
- Tree shaking
- Minification
- Asset optimization

## Webpack

### When to Use
- Complex build requirements
- Legacy projects
- Custom loaders needed

### Configuration
- Keep config maintainable
- Use webpack-merge for environment configs
- Optimize bundle size
- Use code splitting

## TypeScript Compilation

### tsconfig.json
- Set appropriate target
- Configure module system
- Enable strict mode
- Set path aliases

### Build Process
- Compile TypeScript to JavaScript
- Generate type definitions
- Validate types before build
- Fail build on type errors

## Bundle Optimization

### Code Splitting
- Split by route
- Split vendor code
- Lazy load heavy dependencies
- Use dynamic imports

### Tree Shaking
- Use ES modules
- Avoid side effects in modules
- Mark side-effect-free packages
- Use named exports

### Minification
- Enable in production
- Preserve license comments if needed
- Optimize for size vs readability

## Related Patterns

- TypeScript: [../01-language/typescript.md](../01-language/typescript.md)
- Performance: [../02-frontend/react-performance.md](../02-frontend/react-performance.md)
- JavaScript: [../01-language/javascript.md](../01-language/javascript.md)

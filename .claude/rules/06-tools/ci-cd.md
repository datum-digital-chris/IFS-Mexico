# CI/CD Baseline

Continuous Integration and Continuous Deployment requirements.

## MUST

- CI runs on every PR:
  - typecheck,
  - lint,
  - tests,
  - build (where applicable).
- Deploys are repeatable and automated (no manual snowflake steps).
- Rollbacks are supported (previous artifact deployable).

## Required CI Checks

Every pull request must run these checks:

### Typecheck

```yaml
- name: Typecheck
  run: npm run typecheck
  # or: tsc --noEmit
```

### Lint

```yaml
- name: Lint
  run: npm run lint
  # Should fail on errors
```

### Tests

```yaml
- name: Tests
  run: npm test
  # Include unit, integration, and e2e tests as applicable
```

### Build

```yaml
- name: Build
  run: npm run build
  # Verify the project builds successfully
```

## Automated Deploys

Deployments must be:

- **Repeatable**: Same process every time
- **Automated**: No manual steps required
- **Documented**: Clear deployment process

### Deployment Pipeline

```yaml
deploy:
  steps:
    - Checkout code
    - Install dependencies
    - Run tests
    - Build artifacts
    - Deploy to environment
    - Run health checks
    - Verify deployment
```

## Rollbacks

Support rollbacks to previous versions:

- Keep previous artifacts available
- Document rollback procedure
- Test rollback process regularly
- Use versioned deployments

```bash
# Example rollback
kubectl rollout undo deployment/my-app
# or
vercel rollback
```

## SHOULD

- Use preview environments for UI changes.
- Keep build and run stages separate (see Twelve-Factor).

### Preview Environments

For UI changes, use preview environments:

- Automatically create preview for each PR
- Test UI changes in isolation
- Share preview URLs for review
- Clean up previews after merge/close

### Build and Run Separation

Separate build and run stages:

- Build stage: Compile, bundle, optimize
- Run stage: Execute the built artifact
- No compilation during runtime
- Environment-specific config injected at runtime

## Environment Promotion

Use environment promotion strategy:

```
Development → Staging → Production
```

- Deploy to development automatically
- Promote to staging after review
- Promote to production after staging validation

## Health Checks

Include health checks in deployment:

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
  })
})
```

Verify health after deployment before marking as complete.

## Cross References

- Testing: [testing.md](testing.md)
- Packages: [packages.md](packages.md)
- Secrets: [secrets.md](secrets.md)

## References (External)

- [The Twelve-Factor App](https://12factor.net/)

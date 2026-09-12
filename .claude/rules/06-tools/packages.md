# Package Management & Dependencies

Rules for managing npm packages and dependencies.

## MUST

- Lock dependencies (lockfile committed).
- Prefer a single package manager per repo; document it in `README`.
- Pin critical tooling versions (Node, package manager) and enforce via CI.
- Audit dependencies regularly; remove unused dependencies.

## MUST NOT

- No direct installs from random git SHAs for production dependencies without security review.

## Lockfiles

Always commit lockfiles to version control:

- `package-lock.json` (npm)
- `yarn.lock` (Yarn)
- `pnpm-lock.yaml` (pnpm)

Lockfiles ensure consistent installs across environments.

## Package Manager

Use a single package manager per repository:

```json
{
  "packageManager": "pnpm@8.15.0"
}
```

Document the package manager in `README.md`:

```markdown
## Installation

This project uses pnpm. Install dependencies with:

\`\`\`bash
pnpm install
\`\`\`
```

## Version Pinning

Pin critical tooling versions:

```json
{
  "engines": {
    "node": ">=18.0.0 <19.0.0",
    "npm": ">=9.0.0"
  }
}
```

Enforce in CI:

```yaml
# .github/workflows/ci.yml
- name: Check Node version
  run: node --version | grep -E '^v18\\.'
```

## Dependency Auditing

Regularly audit dependencies for vulnerabilities:

```bash
# npm
npm audit
npm audit fix

# pnpm
pnpm audit
pnpm audit --fix

# yarn
yarn audit
```

Set up automated dependency updates:

- Dependabot (GitHub)
- Renovate
- Configure to update patch/minor versions automatically
- Require review for major version updates

## Remove Unused Dependencies

Regularly review and remove unused dependencies:

```bash
# Find unused dependencies
npx depcheck

# Remove unused
npm uninstall <package>
```

## Dependency Strategy

- Prefer small, well-maintained dependencies
- Avoid niche one-off packages
- Prefer packages with active maintenance
- Check package popularity and maintenance status before adding

## Workspaces (Monorepos)

For monorepos, use workspaces:

```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

- Avoid cross-package deep imports
- Use proper package boundaries
- Keep dependencies at appropriate levels

## SHOULD

- Use workspaces for monorepos; avoid cross-package deep imports.
- Prefer small, well-maintained dependencies over niche one-offs.

## Cross References

- Security baseline: [../00-core/security.md](../00-core/security.md)
- CI/CD: [ci-cd.md](ci-cd.md)
- Versioning: [versioning.md](versioning.md)

# Versioning & Releases

Version management for packages, libraries, and APIs.

## MUST

- Use Semantic Versioning for published packages and public APIs.
- Document breaking changes and migration steps.

## Semantic Versioning

Follow the SemVer specification: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Package Versioning

```json
{
  "name": "my-package",
  "version": "1.2.3"
}
```

- Start at `1.0.0` for initial release
- Increment based on changes
- Use pre-release versions for testing: `1.2.3-beta.1`

### API Versioning

For REST APIs, version in the URL:

```
/api/v1/users
/api/v2/users
```

- Increment major version for breaking changes
- Maintain backward compatibility when possible
- Document deprecation timeline for old versions

## Breaking Changes

When making breaking changes:

1. Document what changed
2. Provide migration guide
3. Give advance notice (deprecation warnings)
4. Maintain old version for transition period

## SHOULD

- Automate releases (CI) and generate changelogs from PR titles/labels or conventional commits.
- Use conventional commits for automated versioning:
  - `feat:` → minor version bump
  - `fix:` → patch version bump
  - `BREAKING CHANGE:` → major version bump

## References (External)

- [Semantic Versioning Specification](https://semver.org/)
- [npm Semantic Versioning](https://docs.npmjs.com/about-semantic-versioning)

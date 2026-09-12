# Secrets Management

Rules for handling secrets, API keys, and sensitive configuration.

## MUST

- Treat secrets as configuration, not code.
- Use per-environment secrets (dev/staging/prod) with least-privilege access.
- Rotate secrets; revoke on suspicion.

## MUST NOT

- No secrets in:
  - git history,
  - client bundles,
  - logs.

## Environment Variables

- Store secrets in environment variables
- Use `.env` files for local development only
- Never commit `.env` files to version control
- Provide `.env.example` with placeholder values

```bash
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here
```

```typescript
// Validate required env vars at startup
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'API_KEY']

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}
```

## Secrets Managers

For production, use a secrets manager:

- AWS Secrets Manager
- Azure Key Vault
- Google Cloud Secret Manager
- HashiCorp Vault
- Platform-specific solutions (Vercel, Netlify, etc.)

## Rotation

- Rotate secrets regularly
- Rotate immediately on suspicion of compromise
- Use versioned secrets to allow zero-downtime rotation
- Document rotation procedures

## Access Control

- Scope credentials with least-privilege access
- Use separate credentials per environment
- Audit access to secrets
- Revoke access when no longer needed

## Client Bundles

- Never include secrets in client-side code
- Use server-side API routes to access secrets
- Use environment variables that are replaced at build time (not runtime) for public config only

## SHOULD

- Use a secrets manager (cloud KMS/SM) for production.
- Validate required env vars at startup and crash fast if missing.

## Cross References

- Security baseline: [../00-core/security.md](../00-core/security.md)
- Error handling: [../00-core/error-handling.md](../00-core/error-handling.md)

## References (External)

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [The Twelve-Factor App: Config](https://12factor.net/config)

# Security Baseline

Core security principles that apply to all applications regardless of technology stack.

## MUST (Baseline)

- Validate all untrusted input at the boundary using an **allow-list** model.
- Enforce authentication and authorization centrally; never rely on UI-only checks.
- Keep secrets out of source control; rotate and audit access.
- Log **no sensitive data**: credentials, tokens, full card numbers, secrets, raw auth headers.
- Use dependency scanning and patch routinely (CI + Dependabot/Renovate).

## MUST NOT

- No dynamic SQL string concatenation. Use parameterized queries / query builders.
- No string-building HTML insertion without sanitization/escaping.
- No storing passwords; store salted password hashes via a proven library.

## SHOULD

- Use security headers and safe cookie defaults for web apps (HttpOnly, Secure, SameSite).
- Use rate limiting and request size limits at ingress.

## Input Validation

All untrusted input must be validated at boundaries (HTTP requests, queue messages, environment variables, file I/O).

### Allow-List Model

- Define explicit schemas for expected input
- Reject anything not matching the schema
- Use schema validation libraries (Zod, Joi) for runtime validation

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

// At API boundary
function createUser(req: Request) {
  const result = userSchema.safeParse(req.body)
  if (!result.success) {
    return { error: 'Invalid input' }
  }
  // Process validated data
}
```

## Authentication & Authorization

- Authentication (authN): Verify who the user is
- Authorization (authZ): Verify what the user can do
- Both must be enforced server-side, never rely on client-side checks alone

## Secrets Management

- Never commit secrets to version control
- Use environment variables or secrets managers
- Rotate secrets on suspicion of compromise
- Scope credentials with least-privilege access
- See [secrets management](../06-tools/secrets.md) for detailed rules

## Logging Hygiene

Never log:
- Passwords or password hashes
- API keys, tokens, or secrets
- Full credit card numbers (log last 4 digits only if needed)
- Raw authentication headers
- Personal Identifiable Information (PII) unless required and approved

## SQL Injection Prevention

- Always use parameterized queries
- Use ORM query builders (Prisma, Drizzle, TypeORM)
- Never concatenate user input into SQL strings

```typescript
// Bad: SQL injection risk
const query = `SELECT * FROM users WHERE email = '${email}'`

// Good: Parameterized query
const user = await prisma.user.findUnique({
  where: { email }
})
```

## Cross References

- Backend validation: [03-backend/validation.md](../03-backend/validation.md)
- Secrets management: [06-tools/secrets.md](../06-tools/secrets.md)
- Authentication: [03-backend/authentication.md](../03-backend/authentication.md)
- Database security: [03-backend/database.md](../03-backend/database.md)
- API design: [03-backend/api-design.md](../03-backend/api-design.md)
- Security audit (CVSS / CWE / OWASP Top 10): [security-audit.md](security-audit.md)

## References (External)

- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

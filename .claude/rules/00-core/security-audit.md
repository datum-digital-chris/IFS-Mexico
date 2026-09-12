# Security Audit

Standards and procedures for conducting security audits across the full application stack.

## MUST

- Audit all untrusted input boundaries: HTTP endpoints, queue consumers, file uploads, environment variables, third-party webhooks.
- Map every finding to a **CVSS 3.1 base score** and a **CWE identifier** for consistent severity classification.
- Classify findings using standard thresholds: Critical (9.0-10.0), High (7.0-8.9), Medium (4.0-6.9), Low (0.1-3.9).
- Produce a prioritized remediation plan with effort estimates and ownership assignments.
- Never suppress or downgrade a finding without a documented risk-acceptance entry that includes an expiration date and approver.
- Run dependency scanning (`npm audit`, Trivy, Snyk, or equivalent) as part of every audit.
- Check OWASP Top 10 and CWE Top 25 coverage as a minimum baseline.

## Audit Scope

### Application Security
- **Injection flaws**: SQL injection, NoSQL injection, command injection, LDAP injection, XSS (reflected, stored, DOM-based).
- **Authentication & session management**: weak credentials, missing MFA, session fixation, token leakage, insecure password storage.
- **Authorization**: broken access control, privilege escalation, IDOR (insecure direct object references), missing function-level access checks.
- **Data exposure**: sensitive data in logs, unencrypted data at rest or in transit, PII leakage, overly verbose error messages.
- **Security misconfiguration**: default credentials, unnecessary services, overly permissive CORS, missing security headers, debug mode in production.

### Infrastructure Security
- **Network**: open ports, missing TLS, weak cipher suites, SSRF vectors, DNS misconfigurations.
- **Containers & orchestration**: running as root, unscanned images, exposed Docker sockets, missing resource limits, overly permissive capabilities.
- **Cloud & IAM**: overly broad IAM roles, public S3 buckets / storage, missing encryption at rest, unrotated access keys.

### Dependency Security
- **Direct vulnerabilities**: known CVEs in direct dependencies.
- **Transitive vulnerabilities**: CVEs in nested dependency trees.
- **License compliance**: incompatible or restrictive licenses in the dependency tree.
- **Supply chain risk**: typosquatting, maintainer account takeover, suspicious post-install scripts.

### Configuration & Secrets
- **Secrets in source**: API keys, tokens, passwords committed to version control.
- **Environment variables**: secrets passed insecurely, missing rotation, overly broad scopes.
- **CI/CD pipelines**: leaked secrets in logs, overly permissive pipeline permissions, missing branch protection.

## Audit Process

### Phase 1: Discovery & Inventory
1. Enumerate all entry points (APIs, UI forms, file uploads, webhooks, queues).
2. Identify data flows: where sensitive data enters, is processed, stored, and transmitted.
3. Map authentication and authorization boundaries.
4. Inventory third-party integrations and their trust levels.
5. Collect infrastructure configuration (Docker, Nginx, cloud provider settings).

### Phase 2: Automated Scanning
1. Run dependency audit (`npm audit --json`, `trivy fs .`, or Snyk).
2. Run SAST tools (Semgrep, ESLint security plugins, Bandit for Python).
3. Run DAST tools if applicable (OWASP ZAP, Nuclei).
4. Scan container images for vulnerabilities.
5. Scan for secrets in source (`gitleaks`, `trufflehog`).

### Phase 3: Manual Review
1. Review authentication flows for logic flaws.
2. Test authorization boundaries (horizontal and vertical privilege escalation).
3. Review input validation at every boundary.
4. Check error handling for information leakage.
5. Review cryptographic implementations.
6. Inspect logging for sensitive data exposure.
7. Review rate limiting and abuse prevention.

### Phase 4: Report & Remediate
1. Deduplicate findings across scanners.
2. Assign CVSS score, CWE ID, and affected component to each finding.
3. Map findings to compliance controls if applicable (PCI-DSS, HIPAA, SOC 2, GDPR).
4. Produce executive summary with risk score and top-5 priorities.
5. Produce detailed findings table with remediation steps.
6. Generate compliance status matrix (pass / fail / partial).
7. Create prioritized remediation backlog with effort estimates and timelines.

## Risk Acceptance

When a finding cannot be immediately remediated, document it formally:

```json
{
  "exceptions": [
    {
      "id": "GHSA-xxxx-xxxx-xxxx",
      "cwe": "CWE-79",
      "severity": "medium",
      "reason": "Not exploitable in our context — input is server-generated only",
      "mitigations": "CSP header blocks inline scripts; WAF rule in place",
      "expires": "2025-09-01",
      "approvedBy": "security-team",
      "reviewDate": "2025-06-01"
    }
  ]
}
```

- Every exception **must** have an expiration date.
- Review accepted risks on a regular cadence (at least quarterly).
- Expired exceptions revert to active findings.

## Report Format

### Executive Summary
- Total findings by severity (critical / high / medium / low).
- Overall risk score and trend (improving / stable / degrading).
- Top-5 critical remediation priorities.
- Business impact assessment.

### Detailed Findings Table

| ID | CWE | Component | CVSS | Severity | Compliance | Remediation | Evidence |
|----|-----|-----------|------|----------|------------|-------------|----------|
| F-001 | CWE-89 | `/api/users` | 9.8 | Critical | PCI 6.5.1 | Use parameterized queries | Request log |

### Compliance Matrix
- Map each applicable standard requirement to pass / fail / partial.
- Supported frameworks: OWASP Top 10, CWE Top 25, PCI-DSS v4.0, HIPAA Security Rule, SOC 2 TSC, GDPR, NIST CSF.

### Remediation Backlog
- Priority rank, finding ID, effort estimate (hours), suggested owner, and target date.
- Group by severity: Critical (fix within 48 hours), High (fix within 1 week), Medium (fix within 1 month), Low (track and schedule).

## CI Integration

Run automated checks in CI on every PR:

```yaml
- name: Dependency Audit
  run: npm audit --audit-level=high

- name: Secret Scan
  run: gitleaks detect --source=. --no-banner

- name: SAST
  run: npx semgrep --config=auto .

- name: Container Scan
  run: trivy image --severity HIGH,CRITICAL $IMAGE
```

### Exit Code Convention
| Code | Meaning |
|------|---------|
| `0` | No findings above threshold |
| `1` | Findings above threshold (fail the build) |
| `2` | Scanner error (investigate) |

## Audit Cadence

- **Continuous**: dependency scanning and secret detection in CI (every PR).
- **Weekly**: review new advisories for direct dependencies.
- **Quarterly**: full security audit covering all scope areas.
- **Ad-hoc**: after major changes (new auth flow, infrastructure migration, new third-party integration).

## SHOULD

- Produce machine-readable output (JSON) alongside the markdown report for ticketing system import (Jira, Linear, ServiceNow).
- Track remediation progress and re-test after fixes are deployed.
- Maintain an audit history for trend analysis.
- Share reports with relevant stakeholders (engineering leads, security team, compliance).
- Use separate scanner profiles for different environments (dev, staging, production).

## Related Patterns

- Security baseline: [security.md](security.md)
- Secrets management: [../06-tools/secrets.md](../06-tools/secrets.md)
- Authentication: [../03-backend/authentication.md](../03-backend/authentication.md)
- NextAuth: [../03-backend/nextauth.md](../03-backend/nextauth.md)
- Docker security: [../06-tools/docker.md](../06-tools/docker.md)
- Nginx: [../06-tools/nginx.md](../06-tools/nginx.md)
- CI/CD: [../06-tools/ci-cd.md](../06-tools/ci-cd.md)
- Database security: [../03-backend/database.md](../03-backend/database.md)
- PostgreSQL: [../03-backend/postgresql.md](../03-backend/postgresql.md)

## References (External)

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CVSS 3.1 Calculator](https://www.first.org/cvss/calculator/3.1)
- [PCI-DSS v4.0](https://www.pcisecuritystandards.org/)

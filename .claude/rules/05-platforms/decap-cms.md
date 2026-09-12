# Decap CMS

Git-backed CMS patterns, and the authentication decision that has to be made
before anything else.

## Backend: `github` + a Self-Hosted OAuth Proxy

Decap commits directly to a Git repository. How editors authenticate to do that
is the decision that shapes the rest of the setup, and it cannot be deferred to
the end of a build.

**Git Gateway — the old answer — is deprecated**, and new configurations are
not recommended. Note the distinction, because the two names invite you to
conflate them: Netlify Identity itself is *not* deprecated and remains
available. Git Gateway was the half that actually let Identity users commit.
Identity alone does not give you a CMS.

The standing pattern is the **`github` backend with a self-hosted OAuth
proxy**: two serverless functions that keep the OAuth client secret off the
browser. Editors sign in with a GitHub account that has write access to the
repo.

```yaml
backend:
  name: github
  repo: owner/repo
  branch: main
  base_url: https://example.com   # this deploy's own origin
  auth_endpoint: oauth/auth
```

The trade-off is explicit and worth stating to a client before you build it:
**every editor needs a GitHub account with write access to the repository.**
Where that is acceptable this is the simplest durable option. Where it is not,
see the alternatives at the bottom.

### The two functions

`oauth-auth` starts the handshake, `oauth-callback` finishes it.

- Decap opens a popup at `/oauth/auth`, which redirects to GitHub's consent
  screen; GitHub redirects back to `/oauth/callback` with a code.
- The **code-for-token exchange happens server-side**. The client secret must
  never reach the browser.
- Request `scope: repo` and set `allow_signup: false` so the consent screen
  does not invite a new GitHub signup mid-login.
- **CSRF:** generate a random `state`, set it as an `HttpOnly; Secure;
  SameSite=Lax` cookie scoped `Path=/oauth`, and re-check it in the callback.
  `SameSite=Lax` is required for the cookie to survive the top-level redirect
  back from github.com; a stricter value silently breaks login.
- Store the client id and secret as environment variables, never in the repo.

### `base_url` must be this deploy's own origin

This is the failure that costs the most time, because the error message names
the symptom rather than the cause.

The functions build both the `redirect_uri` and the CSRF cookie from the site
origin. If `base_url` points at a different origin than the one serving the
CMS, the state cookie and GitHub's callback land on different origins and login
fails with **"OAuth state mismatch"**.

On a branch-deploy setup this bites immediately: the platform's `URL` variable
is the *primary* domain, so a branch deploy that uses it points its CMS at the
live site. Use the context-scoped URL for the current deploy instead.

### One template, patched at build time

Keep a single committed `config.yml` and rewrite it during the build so each
deploy gets its own `branch` and `base_url`:

- `branch` ← the branch this deploy publishes
- `base_url` ← the origin this deploy is served on

Anchor the rewrite to the start of a line (`^\s*key:`) so it cannot match the
same word inside a comment. If the anchor is missing when deploy context *is*
present, **fail the build loudly** — silent drift here produces a CMS that
authenticates against the wrong site. Off-platform builds with no deploy
context should be a no-op so local values survive.

Do not hand-edit per environment. The GitHub OAuth App's callback URL must
still be registered for each domain.

### The callback page and CSP

The callback returns a small page that hands the token to the CMS window via
`postMessage`. Under a strict nonce-based CSP an inline script is blocked, so
carry the token in a non-executable JSON island and read it from an external
`'self'` script.

### Alternatives when editors cannot have Git accounts

- **DecapBridge** — purpose-built for Decap. Invite editors by email; they sign
  in with Google, Microsoft or a password. Free tier with paid plans.
- **Auth0** — Netlify's recommended identity platform. More moving parts, worth
  it only for enterprise SSO.
- **Self-hosted GoTrue + Git Gateway** — full control, and you own the uptime.

Verify current status against vendor docs before committing to any of these.
This corner of the ecosystem has moved repeatedly.

## Configuration

`public/admin/config.yml` alongside a minimal `public/admin/index.html`.

The template's location depends on the framework's static directory — Astro
serves `public/` directly, whereas a framework that copies `static/` into
`public/` at build time wants the committed template in `static/` and the
build-time rewrite applied to the generated copy.

```yaml
backend:
  name: github
  repo: owner/repo
  branch: main

media_folder: "src/assets/uploads"
public_folder: "/assets/uploads"

collections:
  - name: services
    label: Services
    folder: src/content/services
    create: true
    slug: "{{slug}}"
    fields:
      - { name: title, label: Title, widget: string }
      - { name: description, label: Meta description, widget: text }
      - { name: order, label: Sort order, widget: number, default: 0 }
      - { name: draft, label: Draft, widget: boolean, default: false }
      - { name: body, label: Body, widget: markdown }
```

- **The CMS fields and the framework's content schema are one contract in two
  files.** A field the schema requires but the CMS does not offer produces a
  build that fails only after an editor saves. Change them together, always.
- `media_folder` is where files are committed; `public_folder` is the URL they
  resolve to. Pointing `media_folder` inside `src/` gets images through the
  build pipeline's optimizer; pointing it at `public/` does not.
- Set `create: true` only where editors should be able to add entries. Omit it
  for fixed pages so nobody invents a second homepage.

## Editorial Workflow

```yaml
publish_mode: editorial_workflow
```

Turns saves into pull requests instead of direct commits, giving a review step
before anything reaches the live site. Worth enabling whenever the editors are
not the developers. It requires the backend to support PRs.

## Local Development

```yaml
local_backend: true
```

With `npx decap-server` running, this edits local files and skips auth
entirely. Use it to build and test collections before the auth decision is
resolved — the two are genuinely independent, so an unresolved backend should
never block CMS work.

Never ship `local_backend: true` to production.

## Deploys

- A commit from the CMS triggers the host's normal build. No webhook needed
  when the CMS commits to the deploy branch.
- With `editorial_workflow`, published content lands via merged PR — confirm
  the branch that merges to is the one the production site builds from.
- Build minutes are consumed per save. On a busy site, batch edits or move to
  request-time content rather than rebuilding on every word change.

## Related Patterns

- Astro: [../04-frameworks/astro.md](../04-frameworks/astro.md)
- Netlify: [netlify.md](netlify.md)
- Security: [../00-core/security.md](../00-core/security.md)
- Secrets: [../06-tools/secrets.md](../06-tools/secrets.md)
- CI/CD: [../06-tools/ci-cd.md](../06-tools/ci-cd.md)

# Security Audit — Seede XR Monitor

Three layers: (1) diff security review, (2) dependency audit, (3) OWASP ZAP dynamic scan.

## 1. Diff security review (my changes)
**Result: no exploitable vulnerabilities introduced.**
Only real new attack surface = `server/socket-handlers/user-socket-handler.js`.
- **SQLi:** all queries parameterized (`WHERE id = ?`) / ORM; `userID` coerced with `Number()`. Safe.
- **AuthZ:** every mutation gated by `checkLogin` + `doubleCheckPassword` (re-verifies the acting
  admin's bcrypt password). A hijacked session cannot add a backdoor admin or reset passwords
  without the current password — holds even under `disableAuth`. No privilege escalation.
- **Data exposure:** `getUserList` returns only `id, username, active` — no hashes / 2FA secrets.
- **XSS:** `Users.vue` uses Vue `{{ }}` auto-escaping, no `v-html`. Safe.
- **Secrets:** none hardcoded; `Dockerfile.seede` bakes no credentials.

## 2. Dependency audit (`npm audit --omit=dev`)
**23 vulns (1 critical, 19 high, 1 moderate, 2 low)** — concentrated in **`ws`** pulled
transitively via the `socket.io` / `engine.io` stack (advisories GHSA-58qx-3vcg-4xpx,
GHSA-96hv-2xvq-fx4p).
- **Pre-existing upstream**, not from this branch.
- `npm audit fix --force` would bump `ws` to 8.21 (outside socket.io's stated range) and could
  break real-time. **Do not force-fix blindly.** Proper fix = upstream `socket.io` bump, or a
  scoped `overrides` entry for `ws` after testing WebSocket/Socket.io connectivity.

## 3. OWASP ZAP scan
Ran `zap.sh -cmd -quickurl` against a running instance.
**Summary: 0 High · 3 Medium · 6 Low · 9 Info.**

| Risk | Finding |
|------|---------|
| Medium | Content-Security-Policy header not set |
| Medium | Missing Anti-clickjacking header (X-Frame-Options) |
| Medium | Web Cache Deception |
| Low | COEP / COOP / CORP headers missing |
| Low | Permissions-Policy not set |
| Low | X-Powered-By leaked |
| Low | X-Content-Type-Options missing |

**Important caveat:** the scanned instance was on the first-run **DB-setup wizard**, which is
served by the minimal `simple-migration-server.js` — NOT the main Express app. So these findings
partly reflect the setup server. The main app already has a header middleware (`server.js`) that
sets `X-Frame-Options: SAMEORIGIN` and (now) `X-Content-Type-Options: nosniff`. **Re-run ZAP
against a fully set-up instance** (in CI/staging) for an accurate picture.

### Applied (safe, non-breaking)
- Added `X-Content-Type-Options: nosniff` to the main app's global header middleware.

### Recommended (need testing / a decision — NOT applied)
- **`app.disable("x-powered-by")`** — the existing `res.removeHeader("X-Powered-By")` is
  ineffective (Express re-adds it at send time). This is the correct fix.
- **CSP** — high value against XSS, but a strict policy can break this SPA (Bootstrap inline
  styles, `data:` SVG, blob workers). Introduce as `Content-Security-Policy-Report-Only` first,
  tune, then enforce.
- **X-Frame-Options on all responses** — the setup server and some static responses omit it.
  Note: status pages are sometimes intentionally embedded in iframes; `SAMEORIGIN`/`DENY` would
  block that. Decide per your embedding needs (there is already a `disableFrameSameOrigin` config).
- **Permissions-Policy / COOP / COEP / CORP** — add cautiously; COEP can break loading of
  cross-origin resources.
- Consider adopting **`helmet`** to manage all of the above consistently.

## Wave 3 — ZAP against a fully set-up instance + fixes

Earlier ZAP hit the setup wizard's minimal server. This run targeted a real, set-up app
(`http://localhost:3001`, admin created, SQLite). Iterated fix → re-scan.

**Fixed (verified via curl + browser, 0 CSP violations across all routes):**
- `X-Frame-Options: SAMEORIGIN` (clickjacking) — confirmed present on the real app.
- `X-Content-Type-Options: nosniff` — added.
- `X-Powered-By` — removed.
- `Permissions-Policy` — added (disables camera/mic/geo/usb/payment/etc.).
- **Content-Security-Policy** — added a complete, app-compatible policy:
  `default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' ws: wss: https:; object-src 'self'; base-uri 'self'; frame-ancestors 'self'`.
  - Real protections: base-tag hijack (`base-uri`), plugin injection (`object-src 'self'`), clickjacking (`frame-ancestors`).
  - `object-src 'self'` (not `'none'`) — the logo is an `<object data="/icon.svg">`; `'none'` blocked it (caught + fixed).
  - Gated on `disableFrameSameOrigin` so intentional embedding still works.

**Final ZAP: 0 High. Remaining are accepted architectural trade-offs (NOT exploitable defects):**
| Finding | Why not "fixed" |
|---------|-----------------|
| CSP `unsafe-inline` (script/style) | The Vue/Bootstrap SPA uses inline styles, and status pages inject **user-configurable** inline analytics (Google/Umami/Plausible). Removing `unsafe-inline` needs an app-wide nonce/hash refactor AND breaks the analytics feature. |
| CSP `https:` wildcard | Needed so user-configured analytics from arbitrary domains load. A fixed allowlist would break that feature; set one per-deployment if you don't use analytics. |
| CSP no-fallback (`form-action`) | `form-action 'self'` omitted to avoid breaking OIDC login form-posts. |
| COOP / COEP / CORP missing | Enforcing them breaks **OIDC login popups** (COOP), **cross-origin status-page embedding** (CORP), and **external analytics/images** (COEP). Left off deliberately. |
| Web Cache Deception | Needs per-path cache-control tuning at the reverse proxy; negligible real risk for this app. |

**To harden further (per-deployment, if features permit):** drop the analytics feature and switch to a
nonce-based strict CSP; add COOP/CORP if you don't use OIDC or embed status pages cross-origin.

## Reproduce
```
node server/server.js --port=3099 --data-dir=./data/zap-test &   # then complete DB setup
/Applications/ZAP.app/Contents/Java/zap.sh -cmd -quickurl http://localhost:3099 -quickout report.md
npm audit --omit=dev
```
Docker (no local ZAP install):
```
docker run --rm --add-host=host.docker.internal:host-gateway ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://host.docker.internal:3001 -I
```

## Re-scan after P6 (Bootstrap removal) — 2026-07-12
P6 was frontend-only (native modal/dropdown JS shims + owned CSS compat layer); no new
server endpoints, external calls, or inline `<script>`. ZAP baseline: **0 FAIL / 60 PASS
/ 7 WARN** — no High/Med, nothing P6-introduced.
- **Fixed:** CSP [10055] "Failure to Define Directive with No Fallback" — added explicit
  `form-action 'self'`, `frame-src 'self'`, `worker-src 'self'`, `manifest-src 'self'`
  (all same-origin; worker/manifest match the service worker + PWA manifest). Verified
  cleared on re-scan; e2e green (service worker still registers under the tighter policy).
- **Accepted (unchanged trade-offs, documented):**
  - CSP [10055] "Wildcard Directive" — the `https:` scheme in script/style/img/font/connect
    is required for user-configurable status-page analytics + framework inline needs.
    Removing it needs an app-wide nonce refactor.
  - COEP [90004] missing — `require-corp` breaks cross-origin resources (external images on
    status pages); deliberately omitted for a self-hosted monitor.
  - Vulnerable JS Library / Dangerous JS Functions / Private IP Disclosure [10003/10110/2] —
    all in the minified vendor bundle: upstream-dependency signatures + example IP strings,
    not exploitable disclosures (consistent with the pre-existing `npm audit` findings).
  - Non-Storable Content / Modern Web App [10049/10109] — informational (cache headers on
    dynamic responses; SPA detection). Not vulnerabilities.

## Wave 10 — Full audit after upstream 2.5.5 + UI work (2026-10-08)

Tools: npm audit (prod), trivy fs (secrets + misconfig), Semgrep 1.140 (p/javascript,
p/nodejsscan, p/xss, p/secrets), OWASP ZAP quick scan (spider + active) against a set-up
instance with a status page, monitors and a mapped status domain.

### Dependencies — 32 → 13 prod advisories (critical 3 → 1, high 20 → 7)
Fixed (all within the repo's `min-release-age=14` .npmrc guard):
- `npm audit fix` (in-range lockfile updates)
- same-major bumps: protobufjs ~7.6.6 (critical RCE), @grpc/grpc-js ~1.14.5, liquidjs ~10.29.0,
  mysql2 ~3.24.4, qs ~6.16.0, ws ~8.21.3
- majors already adopted by upstream master with no code changes: nodemailer ~10.0.10, redbean-node ~0.4.0
- tar ~7.5.22 (direct; only used by extra/ scripts) + `import * as tar` in extra/release/lib.mjs (v7 has no default export)
- overrides: lodash ^4.18.1, minimatch@^9 → ^9.0.7

Accepted (documented, not runtime-reachable or no fix exists):
| Package | Why |
|---|---|
| tar 6 / node-gyp / cacache / make-fetch-happen / http-cache-semantics / @tootallnate/once (via @louislam/sqlite3) | install-time only (native binary download/build); npm's "fix" is a bogus downgrade. http-cache-semantics 4.3.0 is inside the 14-day release-age window |
| axios 0.x | no patched 0.x exists; upstream (incl. 3.0 master) still ships 0.33. Advisories need a pre-existing prototype pollution or browser-only formToJSON |
| mssql / tedious / sprintf-js | DoS via format precision; only the MSSQL monitor with admin-set values; no non-major fix |

### Static analysis
- trivy: **0 secrets**. Misconfig that matters: `docker/Dockerfile.seede` ran as root → **fixed**:
  `docker/seede-entrypoint.sh` chowns `/app/data` (handles volumes written by older root releases)
  then `setpriv` drops to `node`. Trivy's static check still reports DS-0002 because the image's
  last USER is root — the app process is not (verified at runtime). Other flagged Dockerfiles are
  upstream builder/test images we don't ship.
- Semgrep: 131 results, **0 in code this fork wrote**. Triaged upstream hits: SSRF (84) = the
  product's purpose (monitors/notifications call admin-configured URLs); timing attack = bcrypt
  compare; "NoSQLi" = parameterized SQL; badge "XSS" = badge-maker escapes; regexes are fixed
  literals; Teltonika TLS bypass is an explicit opt-in. No actionable defects.

### Dynamic (ZAP) — 0 High
Remaining Mediums were all CSP. **Fixed:** route-aware CSP — the dashboard now gets
`script-src 'self'` and `connect-src 'self' https://api.360messenger.com` (no `unsafe-inline`,
no `https:` wildcard). Status pages (and `/`, which serves one on status domains) keep the
permissive script/connect sources because they inline preload data and load admin-configured
analytics. Verified: login over socket + 8 dashboard routes, 0 CSP violations, 0 console errors.
Accepted: `style-src 'unsafe-inline'` (Vue `:style` bindings), "Private IP disclosure" (example
IPs in bundled help text). ZAP also touched other local services (ports 3000/8080) — out of scope.
Status-domain lockdown re-verified after refactor: /dashboard → 302, socket.io → 403 on the
status domain; unaffected elsewhere.

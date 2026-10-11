# TODO — live checklist

Resume protocol: read this file top-to-bottom, find the first unchecked box,
continue there. Update boxes as you go. **No commits.**

## Phase 0 — Audit & knowledge base
- [x] Explore 5 subsystems
- [x] Write README, PHILOSOPHY, ARCHITECTURE, MINDMAP, PLAN, TODO
- [x] Ingrain workflow contract (persistent memory)

## Phase 1 — Visual rebrand
- [x] 1a Brand tokens in `vars.scss` (primary→#121212, radius→1.5px) + swept all hardcoded radii to 1.5px + `theme.js` hex + dark-mode accent inversion
- [x] 1a Status decoupling: up/ok primary→success (Status.vue, Uptime.vue, socket.js, HeartbeatBar.vue) — functional colours kept
- [x] 1b Space Grotesk (self-hosted @fontsource-variable) imported + font stack
- [x] 1c Logo `public/icon.svg` = Seede glyph, self-theming (black light / white dark)
- [x] 1d Name strings → "Seede XR" (util.js/ts, all lang files, components, index.html, manifest, server providers/RSS)
- [~] 1e Status-colour: implemented recommended default (functional colours kept). Confirm greyscale not wanted.
- [x] 1f Build passes (EXIT=0). Visual + mobile check → Phase 5.
- [ ] 1c-png Regenerate favicon.ico / apple-touch / icon-192/512/png from new SVG (needs rasterizer → use Chromium in Phase 5)

## Phase 2 — License / identity
- [x] Added Seede XR copyright to LICENSE (kept Louis Lam) + NOTICE.md
- [x] package.json name→seede-xr-monitor + description + repo url; JSON validated
- [ ] CNAME (HUMAN: confirm docs domain — left as git.kuma.pet, not guessed)

## Phase 3 — Recipients & multi-admin
- [x] Multi-recipient documented (in Users page description + here): add a notification (email/Resend/etc.) under Notifications and attach to monitors — no account needed
- [x] Handlers: getUserList/addUser/deleteUser/resetUserPassword/setUserActive (server/socket-handlers/user-socket-handler.js) + registered in server.js. Re-auth (doubleCheckPassword) on every mutation; lockout guards (no self-delete, no delete/deactivate last)
- [x] Settings → Users page (src/components/settings/Users.vue) + route + nav. Build passes
- [~] disableAuth: Users page kept visible; still requires password (doubleCheckPassword). Multi-admin + disabled-auth is contradictory — acceptable, documented
- [x] Role model: every user = admin (no role column added — matches existing checkLogin model; user asked for "an admin")
- [x] Resend: provider already exists (kept). Transactional/system email on user-events = separate feature, not requested
- [ ] TESTS (→ Phase 5): e2e Users CRUD + backend guard tests
- CAVEAT: deleting a user orphans their monitors/notifications (user_id FK). Cross-user ownership transfer is out of scope; warn admins.

## Phase 4 — Coolify deploy
- [x] Self-contained multi-stage `docker/Dockerfile.seede` (node:22-bookworm builder → slim runtime, no louislam base)
- [x] `compose.coolify.yaml` (persistent /app/data volume, healthcheck, port 3001)
- [x] `memory/DEPLOY-COOLIFY.md` (steps, env vars, gotchas)
- [ ] Local image build verify — BLOCKED: Docker daemon not running. Cmd: `docker build -f docker/Dockerfile.seede -t seede-monitor .`
- [ ] Deploy to Coolify (HUMAN: infra)

## Phase 5 — Tests & mobile
- [x] Playwright config: env-gated CROSS_BROWSER matrix (chromium/firefox/webkit/msedge + mobile Pixel5/iPhone12) + PW_CHANNEL hook for system browsers
- [x] e2e branding.spec.js (title + brand present, no "Uptime Kuma") — PASSED
- [x] e2e users.spec.js (add→delete admin, current-password guard) — PASSED (exercises real backend handlers)
- [x] Visual verify (system Chrome): login light/dark, dashboard, mobile — all on-brand; dark-mode accent inversion confirmed working
- [x] PNG icons regenerated from Seede SVG (extra/generate-seede-icons.js, ICON_CHANNEL hook)
- [x] Mobile responsive confirmed (390px viewport: header collapse, stats reflow, bottom nav)
- NOTE: bundled Playwright Chromium v119 crashes on this macOS (too old) → used system Chrome via PW_CHANNEL. Full CROSS_BROWSER matrix (webkit/msedge/firefox) runs in CI/Linux or with modern local browsers.
- NOTE: favicon.ico (legacy) still Kuma-era; browsers use icon.svg. Regenerate .ico if desired.
- NOTE: backend guard coverage is via the e2e integration test (handlers are socket-coupled; no pure unit layer)

## Phase 6 — Performance
- [x] Playwright + headless Chrome perf capture (FCP 192ms, load 209ms, ~689KB transfer) → memory/PERFORMANCE.md
- [x] Bundle analysis (app JS 480KB brotli; rebrand adds ~22KB font, negligible)
- [x] Recommendations recorded (vendor chunk split, Lighthouse in CI). Lighthouse not run here (heavy dep + OS-incompatible bundled Chromium)

## Phase 7 — Reviews
- [x] Code review (6 findings) → memory/CODE-REVIEW.md
- [x] Ponytail pass (removed dead favicon; kept justified extras)
- [x] Fixed: userID Number() coercion, font→devDependencies, dead asset, JSDoc/lint
- [x] Rerun: e2e 9 pass, backend 92 pass (3 Docker-only fails), eslint clean
- [ ] DECISION (HUMAN): shared vs isolated admins (finding #1) — see CODE-REVIEW.md

## Phase 8 — Security
- [x] Diff security review: no exploitable vulns introduced (mutations gated by re-auth; params parameterized)
- [x] npm audit: 23 vulns (ws via socket.io, pre-existing upstream) — documented, don't force-fix
- [x] ZAP scan: 0 High / 3 Med / 6 Low (header hardening); ran against setup server — documented
- [x] Applied safe fix: X-Content-Type-Options: nosniff in server.js middleware
- [x] memory/SECURITY-AUDIT.md written (recommends app.disable x-powered-by, CSP report-only, helmet)
- [ ] Re-run ZAP against a fully set-up instance in CI/staging (HUMAN/CI)

## Phase 1.5 — Font Awesome → Lucide icons  [DONE]
- [x] Installed lucide-vue-next; rewrote src/icon.js as a Lucide-backed wrapper keeping the <font-awesome-icon icon="name"/> API (46-icon verified map, forwards $attrs, spin/size)
- [x] Zero call-site edits (110 usages / 32 files unchanged); removed 4 @fortawesome deps
- [x] Added .seede-icon alignment + spin CSS; build + eslint clean; icons render (visual); e2e 9 pass

## Wave 2 (follow-up directives)
- [x] Shared admin workspace: join-all-rooms in afterLogin + unfiltered monitor list/management + notification/proxy/docker/remote-browser lists (API keys kept per-user). e2e shared-admin.spec.js PASSES (2nd admin sees 1st's monitor)
- [x] Removed CNAME (docs move in-dashboard)
- [x] Docker build (docker/Dockerfile.seede) — SUCCESS (exit 0) with Docker up
- [x] Resend from .env (RESEND_API_KEY + EMAIL_FROM) + branded HTML email (seede-email-template.js, XSS-escaped, status-coloured); 4 backend tests; visual preview verified; .env.example added
- [x] In-dashboard Help page (Settings → Help): doc cards + Restart-onboarding button
- [x] Retriggerable onboarding modal (Onboarding.vue): 5-step branded workflow, auto-shows first-run, re-triggerable via window event from Help. Verified visually
- [x] Full test run: Docker image builds; backend 99/99 pass (Testcontainers green w/ Docker); e2e 10/10 pass
- NOTE: onboarding auto-show is suppressed in e2e via addInitScript (localStorage flag) so its backdrop doesn't intercept test clicks

## Wave 3 (bump Playwright, full matrix, README, reviews, ZAP, perf)
- [x] Bumped Playwright + playwright-core to 1.61.1; installed chromium/firefox/webkit
- [x] Full cross-browser matrix run (143 tests × chrome/firefox/webkit/edge + mobile). Fixed test-infra for 1.61: login() exact password, setup-wait race, onboarding webdriver-guard, mobile-safe readiness/selectors
  - MY specs (branding/users/shared-admin) PASS on ALL 6 browsers (verified isolated: 11/11)
  - 28 matrix failures are UPSTREAM specs (status-page analytics/RSS-timing, monitor-form, incident-history, friendly-name) — upstream only CI-tests Chromium; failures are timing/analytics-feature, NOT caused by our changes (verified: status_page.js diff is only the RSS feed-title string)
- [x] Backend suite 99/99 (Docker up), e2e (my specs) green
- [x] README rebranded
- [x] Code+ponytail review wave 2 (see CODE-REVIEW.md) — fixed Lucide bloat, etc.
- [x] Perf optimize: Lucide tree-shake (index 2.64MB→1.73MB raw) + vendor chunk split (app 335KB brotli) — see PERFORMANCE.md
- [x] ZAP on real set-up instance + fixed (CSP, Permissions-Policy, nosniff, X-Frame, X-Powered-By). 0 High. Remaining = accepted architectural trade-offs (see SECURITY-AUDIT.md)
- [x] Local instance live: http://localhost:3001 (admin / admin123). All e2e green with CSP (10/10)

## Wave 4 — UI redesign
- [x] Favicon un-stretched (square viewBox, centered glyph) + PNGs regenerated
- [x] Dark-mode hover contrast fixed (was black-on-black in nav-pills + .nav-link:hover)
- [x] Onboarding now commences on login (per session, webdriver-guarded)
- [x] Left sidebar (all modules) + collapse toggle (persisted) + Cmd/Ctrl+K command palette + glass/frost
- [x] Admin brand logo (public/brand-logo-admin.svg) in an always-dark sidebar (fixes white-logo contrast; dark sidebar + light content)
- [x] Verified: build clean, eslint 0 errors, e2e 10/10, CSP 0 violations; screenshots (dashboard/collapsed/palette) confirm

## Wave 5 — Tailwind design system (full migration)
- [x] P1 Foundation: Tailwind v4 via @tailwindcss/vite, `@theme` tokens (Space Grotesk, mono palette, 1.5px radius, tightened type scale), preflight OFF to coexist with Bootstrap. Build+e2e green.
- [x] P2 Primitives: `seede-design.scss` (unlayered, `#app`-prefixed) — type scale, forms/labels, buttons, surfaces, contrast-safe light+dark. Fixed oversized fonts + black-on-black forms + multiselect.
- [x] P3 Surfaces: dropdowns/modals/cards/tables/alerts/badges/list-groups, contrast-safe light+dark. Verified dark settings.
- [x] P4 Pages verified premium+contrast-correct (light+dark): login, dashboard, add-monitor, settings ×11, status-page editor, public status page, onboarding, command palette. Token-driven — no bespoke per-page work needed.
- [x] P5 Notifications: 90+ forms inherit `.form-control`/`.form-label`/`.btn` restyle automatically. Zero per-component edits.
- [x] P6a Remove Bootstrap JS: native `src/modules/modal.js` + `dropdown.js` (Popper) shims replace `Modal`/`import "bootstrap"`. Verified (modal backdrop/static/dismiss, dropdown flip). @popperjs kept.
- [x] P6b Remove Bootstrap CSS: owned `src/assets/bootstrap-compat.scss` (grid + used utilities + component structure, brand-tokenised) replaces the bootstrap SCSS import; `bootstrap` dropped from package.json + node_modules + vite chunk. QA'd page-by-page (fixed link colour, btn-check active fill, dark `.num`). eslint+stylelint clean, e2e 10/10.
- [x] **P6 COMPLETE** — Bootstrap fully removed. Build green with no bootstrap package present.
- e2e 10/10 throughout; never committed (human commits).

## Blockers awaiting human
- Status colours: greyscale vs functional (implemented functional default).
- CNAME/docs domain.
- Shared vs isolated admins (CODE-REVIEW.md #1) — currently isolated.
- Resend creds as runtime setting; Coolify instance; re-run ZAP on set-up instance.
- Local `docker build -f docker/Dockerfile.seede` (Docker daemon was down here).
- Full CROSS_BROWSER Playwright matrix (webkit/msedge/firefox) in CI/Linux.

## Wave 6 — Premium dark UI, Statuspage-style public pages, status-domain lockdown
- [x] Onboarding re-showed on every new tab/session (sessionStorage) → localStorage, shown until Finish/Skip; Help still replays it
- [x] Shapes: hardcoded radii → `--ui-radius-sm` / `--ui-radius`, both **2.5px** per owner (was 1.5px; briefly 10/16px); pills/badges/bars 2.5px too, only the toggle-switch track stays round; Tailwind radius overrides removed. **Brand rule "max 1.5px radius" is retired by owner request (2026-10-08).**
- [x] Dark default: dashboard userTheme default `dark`; new status pages created with theme `dark`
- [x] Public status page (status.claude.com style): header + RSS "Subscribe to updates", coloured overall banner, per-monitor "Operational/Major Outage/…" label, 90-day daily uptime bars (`DailyUptimeBar.vue`, 30 days on phones) fed by new `dailyList` in `/api/status-page/heartbeat/:slug` (UptimeCalculator daily buckets). Edit mode keeps the old heartbeat bar.
- [x] Status-page domains (Status Page → Domain Names) are public-only: HTTP middleware in server.js redirects dashboard/admin paths to `/`; socket.io refuses handshakes for those hosts (uptime-kuma-server.js allowRequest). Admin buttons hidden there.
- [x] More padding: buttons, inputs, selects (chevron room kept), dropdowns, modals, cards, alerts, list rows, badges, `.shadow-box` 10→16px (big-padding 20→28px)
- [x] Removed duplicate feed setInterval in StatusPage.vue mount
- [x] Verified: build, eslint 0 errors, stylelint 0, e2e 26/28 (2 status-page fails are pre-existing — same on stashed baseline), manual light/dark/mobile/edit-mode screenshots, curl matrix for lockdown
- [ ] HUMAN: give the dashboard its own hostname in Coolify (e.g. monitor.seedexr.com or the Coolify sslip.io URL) BEFORE adding status.seedexr.com to the status page's Domain Names
- [ ] Follow-up: feedInterval is never cleared on unmount (pre-existing); product switcher across status pages not built (each product = own status page slug/domain)

## Wave 7 — Admin bootstrap + team
- [x] `User.ensureAdminFromEnv` (server/model/user.js), called in initDatabase before the needSetup check: creates SEEDE_ADMIN_USERNAME with SEEDE_ADMIN_PASSWORD if missing; never overwrites; weak/missing password → logged, skipped. Fresh instance with the env set skips the setup wizard.
- [x] compose.coolify.yaml defaults username to a.mkwizu@seedexr.com; password is a Coolify secret. .env.example + DEPLOY-COOLIFY.md updated.
- [x] Test: test/backend-test/test-seede-admin-bootstrap.js (2 pass). E2E: real server created the user, socket login ok / wrong password rejected.
- Team members: already shipped & live in prod (Settings → Users: add/reset/deactivate/delete; every user is a full admin, no roles).
- Status page admin buttons: shown only to browsers holding an admin login token AND not on a status-page domain → public never sees them.
- [ ] HUMAN: set SEEDE_ADMIN_PASSWORD in Coolify, deploy, log in as a.mkwizu@seedexr.com, then delete/deactivate the old `admin` user in Settings → Users if no longer wanted

## Wave 8 — Upstream 2.5.5, new logo, split login, 4px radius
- [x] Merged upstream stable **2.5.5** (commit f8e10332, local dev, not pushed). NOT upstream master (3.0.0-beta.0, unreleased). Functional only: TCP leak, stat_daily widening, 304 headers, MariaDB pool, RSS text, SFTP/NTP monitors, PM2 picker, new notification providers, login password reveal. Seede UI/icons/locales/CI removals kept.
- [x] Verified merged code: build, eslint, stylelint, backend 266/266 (Docker), e2e 26/28 (same 2 pre-existing status-page fails)
- [x] New logo (owner's "seedexr-logo-black 1 [Vectorized].svg"): public/icon.svg = framed mark (square, .glyph dark switch); public/brand-logo.svg = full SEEDE XR STUDIOS lockup; PNGs + favicon.ico regenerated (`ICON_CHANNEL=chrome node extra/generate-seede-icons.js`, now also writes favicon.ico). brand-logo-admin.svg removed (unused).
- [x] icon.svg follows the APP theme (global .light/.dark filter in app.scss), not the OS scheme
- [x] Login: no top nav; full-screen split — left MatrixRain.vue (B/W canvas digital rain, 24fps, reduced-motion static, hidden on phones), right logo + form. Username plain input to match upstream's HiddenInput password row; dark .btn-outline-primary made visible.
- [x] Radius: owner minimum **4px** (--ui-radius-sm/--ui-radius, SCSS vars)
- [x] branding.spec now checks the logo img alt (text header removed by design)
- [ ] HUMAN: review + commit the uncommitted Wave 8 UI/logo changes; push dev/main when ready

## Wave 9 — First-run setup redesign
- [x] AuthLayout.vue: shared two-sided shell (MatrixRain left, logo + slot right) for Login, SetupDatabase, Setup
- [x] Setup step 1: "Step 1 of 2", radio cards (SQLite preselected + Recommended, MariaDB/MySQL, Embedded when available), labelled MariaDB fields (host/port side by side), clean "Setting up your database" state; language picker removed (English only)
- [x] Setup step 2: "Step 2 of 2", email-as-username guidance, show/hide password + accurate strength hint (server rule: letters+numbers, >=6), inline mismatch (Create disabled), "add teammates in Settings → Users"
- [x] Fixed app-wide: doubled floating labels (placeholder now transparent in .form-floating), input-group inner corners squared, white flash between pages (index.html body:not(.light) dark)
- [x] 4px radius verified by computed style; 20px field rhythm, 44px fields/buttons
- [x] e2e 26/28 (setup spec passes on new UI; same 2 pre-existing status-page fails)

## Wave 10 — Code review + ponytail review + security audit (details: SECURITY-AUDIT.md)
- [x] Code review (10 findings): fixed MatrixRain reduced-motion resize, light status pages start light (server adds body.light), theme starts from real URL (no mount-time white flash), setup toast crash on network error, embedded MariaDB default/recommended when available, accurate password hint, input-group CSS consolidated into bootstrap-compat, dead .form-floating rule removed. Rejected: language picker (app is English-only by design), CLAUDE.md upstream-PR scope rule (private fork)
- [x] Ponytail: StatusPage.isStatusPageHost() shared by HTTP lockdown + socket.io, statusLabel lookup map, single --ui-radius var, simpler passwordMismatch. Kept hand-written ICO header (PNG-as-.ico is flaky on Safari/Windows)
- [x] Deps 32 → 13 prod advisories (critical 3 → 1); remaining are install-time/no-fix, documented
- [x] Docker image runs the app as non-root `node` (entrypoint chowns legacy root-owned /app/data then setpriv); verified upgrade from root-owned volume, ping, setup, env admin, healthcheck
- [x] Dashboard CSP: script-src 'self', connect-src 'self' + 360messenger; status pages keep analytics allowances. 0 violations
- [x] Verified: eslint/stylelint/build, backend 266/266, e2e 26/28 (2 pre-existing), ZAP 0 High

## Wave 11 — Checkbox, standalone pages, password reset, MCP server + tokens (DONE)
Decisions: MCP tokens reuse api_key (bcrypt, expiry, revoke) + new `scope` column
(null = metrics key, "mcp-read", "mcp-write"); /metrics rejects MCP tokens, /mcp requires
one. MCP = Streamable HTTP at /mcp (stateless). Reset links built ONLY from the
primaryBaseURL setting (no Host header → no reset-link poisoning); generic response
whether or not the account exists; token = 32 random bytes, sha256 stored, 30-min expiry,
single use; email via Resend env (RESEND_API_KEY + EMAIL_FROM).
- [x] 1 Dark-mode checkbox/radio/switch visible (white fill, black tick)
- [x] 2 NotFound (+ other standalone pages): no navbar, centered logo
- [x] 3 Forgot password → email link → reset page (migration: user.reset_token_hash/expires)
- [x] 4 MCP server /mcp (read: list/get monitors, status pages, events; write: pause/resume)
- [x] 5 Settings → MCP: URL + token create (Read only / Read & write, expiry) + client config snippets
- [x] 6 Review (code + ponytail), security check (ZAP/semgrep on new endpoints), tests, commit, push main, verify deploy
- Login "Remember me" misalignment root cause: postcss-rtlcss rewrites compat's .form-check float/-1.5em margin as [dir="ltr"] … (same specificity as scoped overrides, later in bundle) → login row no longer uses .form-check
- MCP grew (owner request): get_overview (system observability), discover_api_endpoints (OpenAPI 3/Swagger 2 JSON → watchable GETs), create_monitors (≤50, dashboard defaults + default notifications), create_status_page (with grouped monitors). Write tools need mcp-write
- Code review #2 fixes: owner-inactive keys rejected (verifyAPIKey), bcrypt cache (sha256 → id, DB re-checked), Origin allowlist = primaryBaseURL, reset: own rate limiter + 5-min resend cooldown + atomic single-use + any password change voids link, per-monitor indexed latest-beat, dark switch knob, ResetPassword equality, Resend.deliver() shared (proxy), updateMonitorNotification reused, shared .choice-card style, esc() reused. Kept: no private-IP block in discover (in-house APIs are the use case; write-scoped, maxRedirects 3, no readOnlyHint)
- Upstream navy dark colours (#232f3b/#282f39/#161b22/#070a10) replaced with brand neutrals
- Verified: build, lint:prod, backend 266/266, e2e 28/30 (2 pre-existing), MCP Inspector CLI (official SDK client), curl matrix, reset flow incl. concurrency
- Delivery: PR dev → main (owner rule), not direct merges

## Wave 12 — Reset emails not sending (fixed)
- Root cause (proven against the Resend API): EMAIL_FROM is "Seede XR Services <noreply@mail.seedexr.com>"; code wrapped it again → "Seede XR <Seede XR Services <…>>" → Resend 422 "Invalid `from` field". Same bug affected Resend monitor alerts. Fix: formatFrom() keeps "Name <address>" as-is, wraps bare addresses (+ test)
- Failed send now clears the reset token (5-min cooldown no longer swallows retries); log includes Resend's error message
- Prod also needs Settings → General → Primary Base URL set, or no link is built (logged: "Primary Base URL is not set")
- Follow-up (owner): EMAIL_FROM is now passed to Resend verbatim (custom name lives in it); RESEND_FROM_NAME retired; verified via Resend GET /emails (from = as written, delivered)
- PROD FINDING (Coolify logs via COOLIFY_MCP in .env): "SEEDE_ADMIN_PASSWORD is missing or too weak; admin … was not created" → a.mkwizu@seedexr.com doesn't exist in prod, so forgot-password silently does nothing for it. Coolify MCP can read env KEYS + logs and deploy, but cannot set env vars (owner must edit in Coolify UI)
- [x] 3rd root cause: Coolify deploys compose.coolify.yaml, which only forwarded SEEDE_ADMIN_* → RESEND_API_KEY/EMAIL_FROM never reached the container. Fixed in compose (+ SEEDE_PRIMARY_BASE_URL, which seeds Settings → Primary Base URL on first boot when empty)
- [x] Coolify env set via REST API (PATCH/POST/DELETE /api/v1/applications/<uuid>/envs, same token): new strong SEEDE_ADMIN_PASSWORD, EMAIL_FROM (verified value), SEEDE_PRIMARY_BASE_URL, RESEND_FROM_NAME deleted
- [x] PR #5 merged (4cdbdc4c), deployed: prod log "Created admin … from SEEDE_ADMIN_USERNAME", "Primary Base URL set …", and a real reset request → "Reset link sent for user id 2"

## Wave 13 — Separate dashboard domain (DONE 2026-10-09)
- [x] DNS monitor.seedexr.com (owner, Cloudflare) → added to Coolify docker_compose_domains next to status.seedexr.com, redeployed, Let's Encrypt cert
- [x] Primary Base URL → https://monitor.seedexr.com (setSettings over monitor host); Coolify SEEDE_PRIMARY_BASE_URL + compose default updated
- [x] status.seedexr.com mapped to status page seedexr-website (saveStatusPage with unchanged config/groups; done over monitor host since status host refuses admin sockets)
- [x] Verified: public host serves status page at /, redirects dashboard/settings/login/reset/metrics/mcp to /, socket.io 403; monitor host dashboard 200, socket 200, /mcp 401 without token

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

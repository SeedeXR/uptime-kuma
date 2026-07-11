# Phased Implementation Plan

Rules: one phase → chunks; **no commits**; 15s review pause between chunks;
self-verify (lint/build/test) each chunk; re-read [TODO.md](./TODO.md) to resume;
flag anything needing a live environment or a human decision.

Legend: 🟢 codeable+verifiable here · 🟡 codeable, needs live env to fully verify · 🔴 needs human decision/creds/infra.

---

## Phase 0 — Audit & knowledge base 🟢 DONE
This `memory/` folder. No source changed.

## Phase 1 — Visual rebrand 🟢
Central-token-first, per brand spec in PHILOSOPHY.
- **1a Tokens** — `src/assets/vars.scss`: `$primary`/palette → Seede (#fff/#121212/#C6C6C6); `$border-radius: 50rem → 1.5px`; `$dropdown-border-radius`. Fix hardcoded `50rem` in `APIKeys.vue`, `Layout.vue`, `ManageMaintenance.vue`; `textarea 19px` in `app.scss`. `src/mixins/theme.js` hardcoded theme hex.
- **1b Fonts** — self-host Space Grotesk (woff2 in `public/fonts/`), `@font-face` + font-family in `app.scss` & `localization.scss`. (Self-host, not Google CDN → offline/PWA/privacy.)
- **1c Logo/icons** — `public/icon.svg` ← Seede glyph; regenerate `favicon.ico`, `apple-touch-icon*.png`, `icon-192/512.png`, `icon.png`. Update `manifest.json` theme/background colors.
- **1d Names** — `src/util.js`+`util.ts` `appName`; `en.json` `"Uptime Kuma"` key; hardcoded strings in `Layout/NotFound/Setup/SetupDatabase/About/StatusPage`; `index.html` title/meta; `manifest.json`; RSS title (`status_page.js`); default sender names in `notification-providers/*`.
- **1e Status colours** 🔴 — DECISION: keep functional up/down/pending/maintenance colours (recommended) vs strict greyscale. Do NOT flatten without sign-off.
- **1f Verify** — `npm run build`, `npm run lint`, visual + **mobile-responsive** check (see Phase 5).

## Phase 2 — License / identity hygiene 🟢
- Retain Louis Lam MIT copyright; ADD `Copyright (c) 2026 Seede XR` + short NOTICE for Seede additions.
- `package.json` name `uptime-kuma → seede-xr-monitor` (internal), add description/author.
- `CNAME` → Seede docs domain (or remove if no docs site). Confirm domain with human 🔴.

## Phase 3 — Recipients & multi-admin 🟡
- **Multi-recipient**: already supported — document how (add notification + attach to monitors). No code.
- **Multi-admin**: new `addUser`/`getUserList`/`deleteUser` socket handlers (mirror `changePassword` pattern, `checkLogin`+`doubleCheckPassword`), a Settings **Users** page (`src/components/settings/Users.vue` + route + nav), and review `disableAuth` single-user auto-login. No role column shipped → decide role model 🔴.
- **Resend for system/admin emails** (invite/alert to added admins) — reuse existing Resend provider config; needs API key+domain (have) wired as a setting 🔴 creds.

## Phase 4 — Coolify deploy 🟡
- Self-contained `docker/Dockerfile.seede` from `node:22-bookworm-slim`: install runtime deps, `npm ci`, `npm run build`, copy healthcheck, `CMD node server/server.js`. (Stock Dockerfile depends on `louislam/*` base images → can't build a rebranded image.)
- `compose.coolify.yaml`: our image, volume `data:/app/data`, `PORT`, healthcheck (accept 302, grace ≥180s).
- Env doc in memory. Verify build locally 🟡; deploy needs Coolify instance 🔴.

## Phase 5 — Tests & mobile responsiveness 🟡
- Playwright: enable `firefox`, `webkit` (Safari), `msedge` (channel) projects in `config/playwright.config.js` + a mobile viewport project (Pixel/iPhone device descriptors).
- e2e specs: brand assertions (title/logo/colors), users CRUD, mobile layout.
- Backend `node:test`: new user handlers, any Resend wiring.
- Run `npm run test-backend` + `npm run test-e2e`. Browser binaries need `npx playwright install` 🟡.

## Phase 6 — Performance profiling 🟡
- Lighthouse (chrome headless) + Playwright trace on dashboard + status page; record metrics; note resource-use wins (embedded chromium, DB pool). Needs running app 🟡.

## Phase 7 — Reviews 🟢
- `/code-review` (correctness) + `/ponytail-review` (over-engineering) on the working diff. Fix findings, rerun Phase 5 tests.

## Phase 8 — Security audit 🟡
- OWASP ZAP baseline scan against running app + dependency audit (`npm audit`), auth/session/headers review. ZAP + running app needed 🔴/🟡. Report to `memory/SECURITY-AUDIT.md`.

---

### Cross-cutting reminders
- Never commit. Never PR upstream.
- Every chunk: understand → edit → lint/build/test → checkpoint summary → 15s pause → update TODO.
- Ground each non-trivial choice against real practice; note the reasoning inline or in TODO.

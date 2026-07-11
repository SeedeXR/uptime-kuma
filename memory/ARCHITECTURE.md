# Architecture Audit

Verified against the repo on 2026-07-11. Paths are repo-relative.

Stack: **Vue 3** (Options API + mixins) · **Bootstrap 5.1.3** (custom SCSS, not
Vuetify) · Vite build → `dist/` · Node backend (`server/server.js`, Socket.io) ·
default **SQLite** under `/app/data`. App version 2.4.0.

---

## A. Branding surface

**Central knobs (change these first, they cascade):**
- `src/util.js` + `src/util.ts` — `appName = "Uptime Kuma"` constant (drives titles/placeholders via `$root.appName`).
- `src/assets/vars.scss` — theme tokens: `$primary: #5cdd8b`, `$border-radius: 50rem`, dark palette (`$dark-bg: #0d1117`, `$dark-header-bg: #161b22`), `$dropdown-border-radius: 0.5rem`.
- `src/mixins/theme.js` — **hardcoded** theme-color hex (`#161B22` dark, `#5cdd8b` light) at ~lines 103/105.
- `src/lang/en.json` — `"Uptime Kuma"` key (line ~1484) + ~15 help strings. Other locales mirror the key.

**Logo / icons (all in `public/`, referenced by absolute path):**
- `public/icon.svg` (primary logo — referenced in `index.html`, `Layout.vue`, `About.vue`, `Setup.vue`, `SetupDatabase.vue`, `NotFound.vue`, and StatusPage default `imgDataUrl`).
- `public/favicon.ico`, `apple-touch-icon.png`, `icon-192x192.png`, `icon-512x512.png`, `icon.png`.
- Dynamic favicon badge via `favico.js` in `src/mixins/socket.js` and `StatusPage.vue`.
- `seede_assets/core-logo-icon.svg` = the staged replacement (white glyph, 128×171), currently unreferenced.

**Hardcoded "Uptime Kuma" user-facing strings:** `index.html` (title/meta), `public/manifest.json` (name/short_name/description/theme_color/background_color), `Layout.vue` (22,124), `NotFound.vue`, `Setup.vue`, `SetupDatabase.vue`, `About.vue`, `StatusPage.vue` ("Powered by" footer), `server/model/status_page.js` (RSS title), and default sender names in many `server/notification-providers/*.js`.

**Fonts:** system stack only, defined in `src/assets/app.scss` (`#app` font-family) + `src/assets/localization.scss`. No Google Fonts / `@font-face` yet → **Space Grotesk must be added** (self-hosted for offline/PWA).

**Border radius:** `$border-radius: 50rem` (pill) in `vars.scss`; duplicated hardcoded `50rem` in `APIKeys.vue:219`, `Layout.vue:391`, `ManageMaintenance.vue:298`; `textarea` `19px` in `app.scss:30`.

**Routing:** admin = `Layout.vue` → `Dashboard.vue` + settings sub-pages (`src/components/settings/*`). Public = `src/pages/StatusPage.vue` (self-contained header/logo/footer/theme). `CNAME` = `git.kuma.pet` (docs-site domain).

---

## B. Notification system

- Providers: `server/notification-providers/*.js`, each `extends NotificationProvider` (`notification-provider.js`). Override `async send(notification, msg, monitorJSON, heartbeatJSON)` — return a success string, throw on failure. Helpers: `renderTemplate`, `throwGeneralAxiosError`, `getAxiosConfigWithProxy`.
- **Resend already implemented**: `server/notification-providers/resend.js` (POST `https://api.resend.com/emails`, `Authorization: Bearer`) + form `src/components/notifications/Resend.vue`. Config keys: `resendApiKey`, `resendFromEmail`, `resendFromName`, `resendToEmail`, `resendSubject`.
- To add a provider, 6 files (name string identical across them): the provider `.js`; register in `server/notification.js` (require + `new X()` in `init()` list); form `.vue`; `src/components/notifications/index.js` (`NotificationFormList`); `src/components/NotificationDialog.vue` (`notificationNameList()` category); `src/lang/en.json` (`$t()` keys).
- Trigger: `server/model/monitor.js` ~1503 on heartbeat state change → `Notification.send(JSON.parse(notification.config), msg, monitorJSON, heartbeatJSON)`. Also cert-expiry, domain-expiry, and the "Test" button (`server/server.js` ~1603).

---

## C. Users / auth / admin

- User table: `db/knex_init_db.js:53-63` (`id`, `username` unique, `password` bcrypt, `active`, `timezone`, `twofa_*`). **No role/admin column.**
- Auth: `login` handler `server/server.js:450` → `server/auth.js`. bcrypt (`server/password-hash.js`, saltRounds 10, legacy SHA1 auto-upgrade). JWT (`server/model/user.js:41`, payload `{username, h:shake256(password)}` — password change invalidates tokens). 2FA TOTP (`server/2fa.js`).
- **Multi-user: NOT supported as shipped.** Schema is multi-user-*capable* (auto-inc id, `user_id` FKs everywhere) but: only creation path is one-time `setup` (`server/server.js:705`, refuses if any user exists); no Users UI (`src/components/settings/` has no Users page); no `addUser`/`manageUsers` handler; `disableAuth` auto-login (`server.js:1749`) grabs the single user; any logged-in user is effectively admin (`checkLogin` only asserts *a* user).
- Notifications are **per-user (ownership)** via `notification.user_id`, attached to monitors via `monitor_notification` join table. **"Additional recipient" needs NO new user** — add another notification and attach it to monitors (existing feature).
- Handler pattern to copy (`changePassword`, `server.js:1442`): `checkLogin(socket)` → optional `doubleCheckPassword` → work → `callback({ok, msg, msgi18n})`.

---

## D. Testing

- Backend: Node built-in `node:test` (`node:assert`). Tests in `test/backend-test/` (`test-*.js` / `*.test.js`). Testcontainers for real-DB monitor tests. Run: `npm run test-backend`.
- e2e: **Playwright**, specs in `test/e2e/specs/*.spec.js`, config `config/playwright.config.js`. Auto-boots its own server (`--port=30001 --data-dir=./data/playwright-test`). Login fixture admin/admin123, `getByTestId` selectors, SQLite snapshot/restore. Run: `npm run test-e2e`.
- **Only Chromium enabled** — Firefox commented out; no WebKit/Safari or Edge. Cross-browser ask = add `webkit` + `msedge` (channel) + `firefox` projects.
- Lint: ESLint (`.js/.vue`) + Stylelint + Prettier. `npm run lint`. `tsc` exists but not in CI.
- CI: `.github/workflows/auto-test.yml` (matrix OS × Node 20/24; backend + e2e + linters). No frontend/component unit tests exist.

---

## E. Build & deploy (Coolify)

- Prod Dockerfile `docker/dockerfile` is **multi-stage on `FROM louislam/uptime-kuma:base2`** (prebuilt Docker Hub base with chromium/mariadb) + a Go healthcheck from `louislam/uptime-kuma:builder-go`. `dist/` is prebuilt into the release, not built in this Dockerfile.
- `compose.yaml`: single service `image: louislam/uptime-kuma:2`, volume `./data:/app/data`, port `3001:3001`.
- Start: `node server/server.js` under `dumb-init`. Port default **3001**, honours `PORT`/`UPTIME_KUMA_PORT`. Binds all interfaces if `HOST` unset.
- Config: `server/config.js` (port/host/ssl), `server/database.js:137` (`DATA_DIR` default `./data/`). DB type + admin chosen by **first-run web setup wizard**, persisted to `data/db-config.json`. No env-only DB/admin bootstrap.
- Healthcheck: Go binary; HTTP `/` returns **302** (no `/health` endpoint). `start-period=180s`.

**Coolify gotchas:**
1. Building `docker/dockerfile` needs the louislam base images → to ship a **rebranded** image you need a self-contained Dockerfile (build `dist` + install runtime deps from a plain `node:22` base) OR mirror/rebuild the base. This is the main deploy work.
2. **Persistent volume at `/app/data` is mandatory** or every redeploy wipes the DB and re-runs setup.
3. First-run wizard sets DB + admin; keep the volume so it runs once.
4. Set Coolify `PORT`/mapping to 3001; don't pin `HOST` to 127.0.0.1.
5. Health grace period ≥180s; accept 302 if using HTTP healthcheck.
6. Traefik must allow WebSocket upgrades (Socket.io).

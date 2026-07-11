# Mindmap

```
Seede XR Uptime Monitor (fork of Uptime Kuma v2.4.0)
│
├─ BRAND (Phase 1)
│   ├─ Tokens ......... src/assets/vars.scss ($primary, $border-radius→1.5px)
│   ├─ Theme hex ...... src/mixins/theme.js (hardcoded #161B22/#5cdd8b)
│   ├─ Name const ..... src/util.js / util.ts (appName)
│   ├─ Fonts .......... app.scss + localization.scss (add Space Grotesk)
│   ├─ Logo/icons ..... public/icon.svg + favicon/apple/PWA png set
│   ├─ Strings ........ en.json + Layout/NotFound/Setup/About/StatusPage + index.html + manifest.json
│   └─ Status colours . KEEP up/down/pending/maintenance distinct (UX)
│
├─ NOTIFICATIONS
│   ├─ Base .......... server/notification-providers/notification-provider.js (send())
│   ├─ Resend ........ ALREADY EXISTS (resend.js + Resend.vue)  ✅
│   ├─ Register ...... server/notification.js + index.js + NotificationDialog.vue + en.json
│   └─ Trigger ....... server/model/monitor.js ~1503 (heartbeat state change)
│
├─ USERS / AUTH (Phase 3)
│   ├─ Table ......... db/knex_init_db.js:53 (no role column)
│   ├─ Auth .......... server/auth.js + password-hash.js (bcrypt) + 2fa.js + JWT
│   ├─ Setup only .... server/server.js:705 (refuses 2nd user)  → multi-admin NOT shipped
│   ├─ disableAuth ... server.js:1749 (single-user auto-login) → must review
│   └─ Recipients .... per-monitor via monitor_notification join (multi-recipient works today)
│
├─ TESTS (Phase 5)
│   ├─ Backend ....... node:test  → test/backend-test/
│   ├─ e2e ........... Playwright → test/e2e/specs/  (ONLY chromium; add webkit/edge/firefox/mobile)
│   └─ CI ............ .github/workflows/auto-test.yml
│
├─ DEPLOY (Phase 4)
│   ├─ Dockerfile .... docker/dockerfile (FROM louislam/* base — can't rebuild rebranded)
│   ├─ compose ....... compose.yaml (single svc, /app/data volume, :3001)
│   ├─ Config ........ server/config.js (PORT), database.js (DATA_DIR, SQLite)
│   └─ Coolify ....... need self-contained Dockerfile + persistent /app/data volume
│
└─ GOVERNANCE (PHILOSOPHY.md)
    ├─ MIT: keep Louis Lam copyright, ADD Seede XR
    ├─ Private fork, never PR upstream (anti-slop policy)
    └─ Workflow: chunks · no commit · 15s review pause · self-verify · resume from TODO
```

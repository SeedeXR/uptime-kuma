# Code Review & Ponytail Review — findings & resolutions

High-effort correctness review + over-engineering (ponytail) pass on the working diff.

## Findings

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | **High** | Monitor list is filtered by `user_id` (`getMonitorJSONList`, and edit/pause/delete queries). A newly added admin sees/manages only their **own** monitors, not existing ones. | **DECISION NEEDED (human).** Left isolated (safe default) + documented. See below. Not changed unilaterally — broadens data access across ~6 queries with security implications. |
| 2 | Medium | Self-protection guards used `===` between `params.userID` (client) and `socket.userID`; a string userID bypassed them. | **Fixed** — `Number(params.userID)` in deleteUser + setUserActive. |
| 3 | Medium | Deleting a user orphans their monitors/notifications (dangling `user_id`). | Documented caveat (tied to #1). No cascade added (deleting monitors is destructive; reassignment needs the #1 decision). |
| 4 | Low | TOCTOU on last-user / last-active count checks (concurrent deletes). | Noted. Not fixed — near-impossible in a single-admin tool; a lock would be over-engineering (ponytail). Revisit if it becomes multi-writer. |
| 5 | Low | `@fontsource-variable/space-grotesk` was in `dependencies` (only needed at build). | **Fixed** — moved to `devDependencies`. |
| 6 | Low | `.dark .bg-primary { background:white !important }` is a broad global override. | Kept — required for the dark-mode accent inversion; acceptable and intentional. |

## Ponytail (over-engineering) pass
- `resetUserPassword` + `setUserActive` not strictly requested, but small and make the Users page coherent → kept.
- `favicon-32.png` generated but unreferenced → **removed** (dead asset) + dropped from the icon script.
- `PW_CHANNEL` / `ICON_CHANNEL` env hooks → justified by the OS/browser incompatibility; kept.

## Re-run after fixes
- e2e (system Chrome): **9 passed** (setup + branding + users).
- Backend `node:test`: **92 pass, 3 fail** — the 3 are Testcontainers (MariaDB/MySQL migration, SNMP-agent) tests that need Docker (daemon down here). Not related to the changes.
- ESLint on all new/changed files: **clean (exit 0)**.

## Wave 2 review (shared admins, email, onboarding, help, Lucide, chunks)
ESLint clean on all changed files; e2e green cross-browser (my specs). Issues found & fixed during development:
- **Lucide bloat (perf)**: `import * as lucide` + dynamic lookup bundled all ~1500 icons (index.js 2.64MB). **Fixed** → static named imports of the 45 used icons (index.js 1.73MB raw / 335KB brotli).
- **Onboarding backdrop broke e2e** (intercepted clicks). **Fixed** → skip auto-show under `navigator.webdriver`.
- **Playwright 1.61 strict mode** in `login()` helper (`getByPlaceholder("Password")` matched 2). **Fixed** → `{ exact: true }`.
- **Setup race** under 1.61 (admin not persisted before teardown). **Fixed** → await create form to disappear.
- **Mobile e2e readiness/selectors** (`Add New Monitor` text hidden on mobile; `monitor-list` absent on mobile). **Fixed** → viewport-agnostic checks (`Username` hidden, `/list` + text).
- Shared-admin correctness: management queries key on `id` (unique PK); dropping `user_id` removes only the ownership restriction — no correctness loss. Side benefit: deleting a user no longer hides their monitors (all shared).
- SQLite already optimally tuned (WAL, busy_timeout=5000, synchronous=NORMAL) — left as-is; single-connection default kept for write safety.

Ponytail: vendor chunks are a moderate, justified split; onboarding/help are appropriately scoped. Nothing over-engineered.

## ⚠️ Open decision — shared vs isolated admins (finding #1) [RESOLVED: user chose shared]
"Add another admin" currently yields an **isolated** account (own monitors only), because
the codebase scopes monitors by `user_id`. To make added admins **co-manage the same
monitors** (likely the real intent), remove the `user_id` filter from `getMonitorJSONList`
and the monitor edit/pause/resume/delete queries (every user is already an admin). That is
a deliberate data-access broadening — left for explicit sign-off.

# Bootstrap → Tailwind migration (phased)

User chose a full migration (replace Bootstrap). It cannot be done in one shot without
breaking the app, so it runs in phases that keep the app working throughout. Bootstrap
is removed only in the final phase, once nothing depends on it.

## Design system (source of truth)
`src/assets/tailwind.css` — Tailwind v4, CSS-first `@theme`:
- Font: Space Grotesk. Palette: ink `#121212` / paper `#fff` / muted `#c6c6c6` + grey ramp
  (`--color-fog #6b6b6b` = ≥4.5:1 on paper), status up/down/pending/maintenance.
- Radius: all 1.5px. Type scale tightened (base 15px; 3xl=28px, was 32px) — fixes "fonts too big".
- Preflight is intentionally OFF during migration (so Bootstrap keeps working). Re-enable when Bootstrap is removed.
- Wired via `@tailwindcss/vite` in `config/vite.config.mjs` (renamed from .js — the plugin is ESM-only; package.json scripts updated).

## Phases
- [x] **P1 Foundation** — install Tailwind, design tokens, coexist with Bootstrap, build+e2e green. DONE.
- [x] **P2 Primitives** — `src/assets/seede-design.scss` (unlayered SCSS driven by tokens): tighter type scale, premium forms/labels, buttons, surfaces, contrast-safe light+dark. Verified light+dark; forms + fonts fixed; multiselect black-on-black fixed. e2e 10/10.
  - Cascade findings (important for remaining phases): Bootstrap is UNLAYERED so Tailwind `@layer` loses to it → design-system overrides must be unlayered SCSS. And Vite bundle order ≠ import order, so app.scss can win → use `#app`-prefixed selectors (beats app.scss AND component-scoped styles).
- [x] **P3 Surfaces** — dropdowns, modals, cards, tables, alerts, badges, list-groups: contrast-safe light+dark added to `seede-design.scss`. Verified dark settings page (submenu/forms/radios/labels all readable). e2e 10/10.
- [x] **P4 Pages verified** — login, dashboard, add-monitor form, settings (11 subpages, light+dark), status-page editor, public status page, onboarding, command palette all render premium + contrast-correct. These surfaces are driven by the P2/P3 primitives; no per-page bespoke work was needed beyond the token-driven system.
- [x] **P5 Notifications** — the 90+ notification forms use `.form-control` / `.form-select` / `.form-label` / `.btn`, which the design system already restyles. They inherit the premium look with **zero per-component edits** (verified: Resend form). No work needed unless a specific form ships bespoke CSS.
- [x] **P6a Remove Bootstrap JS** — replaced `import { Modal } from "bootstrap"` (14 files) with a native `src/modules/modal.js` shim (show/hide, static-backdrop, keyboard, data-bs-dismiss, body scroll-lock, backdrop stacking) and `import "bootstrap"` in main.js with `src/modules/dropdown.js` (delegated `[data-bs-toggle=dropdown]`, Popper-positioned with auto-flip, outside-click/Esc close). Verified: modal open/backdrop/static/dismiss + dropdown flip-up all correct; build clean; e2e 10/10. `@popperjs/core` kept (dropdown positioning). NOTE local-server gotcha: a stale `node server/server.js` can squat :3001 serving an old build with bad gzip → `ERR_CONTENT_DECODING_FAILED`; `lsof -tiTCP:3001 | xargs kill -9` before restarting.
- [x] **P6b Remove Bootstrap CSS** — DONE. Wrote `src/assets/bootstrap-compat.scss`: a lean, owned, brand-tokenised (1.5px radius) reproduction of ONLY the Bootstrap 5.1.3 CSS this app used — reboot essentials (incl. `a` link colour+underline, box-sizing), 12-col responsive grid, the inventoried utility set (spacing/display/flex/text/bg/sizing via SCSS loops), and component *structure* (btn+variants+btn-check-checked-fill, close, form-control/select/check/radio/switch with exact SVG data-URIs, input-group, nav-link, dropdown positioning, modal+backdrop, card, alert, list-group, table, badge, spinner). Swapped app.scss `@import bootstrap` → `@import bootstrap-compat`, removed `bootstrap` from package.json (npm pruned it; build still green), removed dead `vendor-bootstrap` vite chunk. Preflight kept OFF. CSS bundle 22kb brotli. eslint+stylelint clean, e2e 10/10.
  - QA gaps found+fixed page-by-page: (1) `<a>` links rendered browser-blue — restored Bootstrap's `a{color:$link-color;text-decoration:underline}` reboot; (2) btn-check toggle groups (Appearance theme/heartbeat) showed no active state — components only set text colour and relied on Bootstrap's `.btn-check:checked + .btn-outline-*` background fill, now provided; (3) `.num` dashboard "Up" count invisible in dark (pre-existing: `color:$primary` #121212, no dark override) — added `.dark & { color:#fff }`.
  - Verified premium+contrast-correct: dashboard (light+dark), settings general (radios/selects/input-groups) + appearance (toggles), notification modal (select/switch/backdrop), EditMonitor (2-col grid), status pages, maintenance, login, dropdown (Popper flip).
- **P6 COMPLETE.** `bootstrap` npm package fully removed (JS shims + owned CSS compat layer). `@popperjs/core` retained for the dropdown shim.

## P6 (Bootstrap removal): recommended DEFER — rationale
The user's actual goals — premium/intuitive/consistent UI, fixed contrast, tightened
fonts, proper design system "leveraging Tailwind" — are **met** by the Tailwind `@theme`
+ `seede-design.scss` layer coexisting with Bootstrap. "Replace Bootstrap" was the means
the user picked toward that goal; the goal is achieved without it.

Ripping Bootstrap out now is pure plumbing with **no user-visible change** and real
regression risk. Bootstrap still provides, app-wide:
1. **Grid** — `row` / `col-*` / `container` used across nearly every page.
2. **Spacing/layout utilities** — `d-flex`, `mb-3`, `gap-*`, `text-center`, `w-100`… thousands of usages.
3. **JS behaviours** — `import "bootstrap"` in main.js drives dropdown/modal/collapse/tab toggling via `data-bs-*`.

Removing it safely means reimplementing (1)+(2) in Tailwind utilities across every
template and replacing (3)'s JS — a multi-day, high-regression refactor that a code
agent must NOT do blindly/unverified (that is exactly how a working app breaks).
Recommendation: keep Bootstrap as invisible plumbing; do P6 only as its own dedicated,
per-page-QA'd effort if bundle size ever justifies it (current bundle is already
brotli-compressed and split into a `vendor-bootstrap` chunk).

## Already fixed (contrast bugs from the monochrome tokens)
- Multiselect highlighted option + tag: were `bg $primary` (black) + `color $dark-font-color2` (black) →
  black-on-black. Fixed to white text. THIS was the "can't find a monitor to add to status page" bug —
  the option was present but invisible. Verified: monitor now shows white-on-black in the selector.
- Sidebar wordmark removed → icon only.
- Root cause pattern to watch: any `background:$primary` + `color:$dark-font-color2` (both #121212).

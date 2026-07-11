# Philosophy & Constraints

The rules that govern every change. These override convenience.

## 1. Legal — the LICENSE is not rebrandable

`LICENSE` = MIT, `Copyright (c) 2021 Louis Lam`. MIT grants the right to fork,
rebrand the product, and deploy commercially **only if the original copyright
notice is retained**.

- ✅ Rebrand product name, logo, colours, fonts, UI, meta, docs.
- ✅ ADD `Copyright (c) 2026 Seede XR` for Seede XR's own additions.
- ❌ NEVER delete/overwrite the Louis Lam copyright line. Doing so is a license
  violation, not a rebrand.

## 2. This repo's anti-AI-slop policy

`CLAUDE.md` bans AI-generated PRs to `louislam/uptime-kuma` (public "Wall of
Shame", account ban). **Confirmed with the user: this is a private, self-hosted
fork that will NEVER be PR'd upstream.** So the policy's concern does not
trigger — but the spirit holds: every change is understood, reviewed, and
tested by a human before it ships. No blind generation.

## 3. Brand spec (Seede XR)

| Token | Value |
|-------|-------|
| Name | **Seede XR** |
| Font | **Space Grotesk** |
| White | `#ffffff` |
| Black | `#121212` |
| Grey | `#C6C6C6` |
| Max border-radius | **1.5px** (nothing rounder) |
| Logo | `seede_assets/core-logo-icon.svg` (white glyph) |

Applies to admin app, web app, and public status pages uniformly.

### ⚠️ Design caveat — functional status colours
A monitoring dashboard MUST distinguish states at a glance: **up / down /
pending / maintenance**. White+black+grey alone cannot. Recommendation:
apply the brand palette to chrome, typography, surfaces, and borders; **keep
distinct functional colours** for heartbeat status (green up / red down /
amber pending / blue maintenance). Confirm this before flattening status
colours to greyscale. See PLAN Phase 1.

## 4. Working rules (ponytail / lazy-senior)

- Reuse what exists before writing new (Resend provider already exists; the
  brand has a central `appName` constant and a central `vars.scss`).
- Smallest change at the right place — one central token over N per-component edits.
- One phase at a time. Review + manual test before the next.
- Non-trivial logic leaves one runnable check behind.
- Mark deliberate shortcuts with a `ponytail:` comment.

## 5. Definition of done (per phase)

Code understood → lint passes → relevant tests pass → manually verified in a
real browser → human reviewed. Only then is a phase "done".

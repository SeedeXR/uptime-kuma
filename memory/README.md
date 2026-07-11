# Seede XR — Uptime Monitor · Knowledge Base

This folder is the single source of truth for rebranding and extending the
Uptime Kuma fork into **Seede XR**'s monitoring service. Read in this order:

| File | What it is |
|------|-----------|
| [PHILOSOPHY.md](./PHILOSOPHY.md) | Non-negotiable constraints: license, anti-slop policy, brand spec, working rules. Read first. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Audit of the 5 subsystems (branding, notifications, users/auth, tests, deploy) with exact file paths. |
| [MINDMAP.md](./MINDMAP.md) | Visual map of the system and the rebrand surface. |
| [PLAN.md](./PLAN.md) | Phased implementation plan. One phase at a time, reviewed + tested before the next. |
| [TODO.md](./TODO.md) | Live checklist tracking every phase. |

## Status

- **Phase 0 (this audit): DONE.** No source code changed.
- **Everything else: NOT STARTED.** Awaiting go-ahead per phase.

## Ground truth (verified against the repo, not assumed)

- Fork: `github.com/SeedeXR/uptime-kuma`, Uptime Kuma v2.4.0, Vue 3 + Bootstrap 5, Node 22.
- License: MIT, `Copyright (c) 2021 Louis Lam` — **must be retained** (see PHILOSOPHY).
- Resend notification provider **already exists** in the repo.
- Multi-admin **not supported** as shipped; multi-recipient **already possible** today.

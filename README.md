<div align="center" width="100%">
    <img src="./public/icon.svg" width="96" alt="Seede XR" />
</div>

# Seede XR Monitor

Self-hosted uptime & performance monitoring for Seede XR. A branded fork of
[Uptime Kuma](https://github.com/louislam/uptime-kuma) with a shared multi-admin
workspace, branded email alerts (Resend), an in-app onboarding flow, and Lucide icons.

## Features

- **Monitoring** — HTTP(s), TCP, keyword, JSON-query, WebSocket, Ping, DNS, Push,
  Steam, Docker containers and more, at intervals down to 20s.
- **Shared admin workspace** — every admin sees and manages the same monitors,
  notifications and status pages. Add teammates under **Settings → Users**.
- **Branded email alerts** — the **Resend** channel sends Seede XR-branded HTML
  (status-coloured), configured via environment variables.
- **90+ notification channels**, public status pages, ping charts, certificate info,
  proxy support, 2FA.
- **Guided onboarding** — a retriggerable setup workflow (from **Settings → Help**).
- **Seede XR brand** — Space Grotesk, monochrome palette (#121212 / #ffffff / #C6C6C6),
  1.5px corners, self-theming logo, functional status colours retained.

## Quick start (Docker)

Builds a self-contained, rebranded image (no external base images):

```bash
docker build -f docker/Dockerfile.seede -t seede-monitor .
docker run -d --name seede-monitor -p 3001:3001 -v seede-data:/app/data seede-monitor
```

Open <http://localhost:3001> and complete the one-time setup wizard.

For **Coolify**, use `compose.coolify.yaml` (or the Dockerfile build pack). See
[`memory/DEPLOY-COOLIFY.md`](./memory/DEPLOY-COOLIFY.md) for the full guide.

## Configuration (`.env`)

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key for email alerts |
| `EMAIL_FROM` | Verified sender address, e.g. `alerts@yourdomain.com` |
| `RESEND_FROM_NAME` | Optional display name (default `Seede XR`) |

Data (SQLite DB, uploads, config) persists under `/app/data` — **mount a persistent
volume** in production.

## Development

```bash
npm ci
npm run dev            # frontend (vite) + backend, hot reload
npm run build          # production frontend build → dist/
npm run start-server   # run the backend (serves dist/)
```

## Testing

```bash
npm run test-backend              # Node built-in test runner (Docker needed for DB/SNMP tests)
npm run test-e2e                  # Playwright, Chromium
CROSS_BROWSER=1 npm run test-e2e  # Chrome, Firefox, Safari (WebKit), Edge + mobile viewports
npm run lint                      # ESLint + Stylelint
```

`PW_CHANNEL=chrome|msedge` runs e2e against a system-installed browser.

## Attribution & License

Seede XR Monitor is a fork of **Uptime Kuma**, © 2021 Louis Lam, MIT-licensed.
The original copyright and license are retained in [`LICENSE`](./LICENSE); Seede XR's
branding and modifications are documented in [`NOTICE.md`](./NOTICE.md). Not affiliated
with or endorsed by the Uptime Kuma project.

Released under the [MIT License](./LICENSE).

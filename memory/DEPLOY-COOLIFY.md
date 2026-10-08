# Deploying Seede XR Monitor on Coolify

Files: `docker/Dockerfile.seede` (self-contained, rebranded) and `compose.coolify.yaml`.

## Why not the stock Dockerfile
`docker/dockerfile` builds `FROM louislam/uptime-kuma:base2` + `builder-go` (Docker
Hub images). Coolify can't rebuild those, and they'd ship the upstream brand. Our
`Dockerfile.seede` builds everything from public `node:22-bookworm` images.

## Steps
1. **New Resource → your Git repo** (`github.com/SeedeXR/uptime-kuma`).
2. Build pack: **Docker Compose** → `compose.coolify.yaml` (or **Dockerfile** →
   `docker/Dockerfile.seede`).
3. **Persistent volume** (critical): mount at `/app/data`. Compose already declares
   the `seede-data` named volume; ensure Coolify keeps it across deploys.
4. **Port**: app listens on **3001**. Set Coolify's port / `PORT` to 3001.
   Don't set `UPTIME_KUMA_HOST=127.0.0.1` (proxy must reach it; leave unset → all interfaces).
5. **Health grace period ≥ 180s** and accept HTTP **302** (root redirects to
   dashboard/login). Migrations on first boot can take a couple minutes.
6. **WebSockets**: Coolify/Traefik must allow WebSocket upgrades (Socket.io) —
   usually automatic.
7. **First run**: open the app → setup wizard creates the DB config + first admin.
   Because `/app/data` persists, this happens once.
8. TLS: let Coolify terminate HTTPS; leave the app's SSL env vars unset.

## Environment variables (optional)
| Var | Purpose | Default |
|-----|---------|---------|
| `PORT` / `UPTIME_KUMA_PORT` | Listen port | 3001 |
| `DATA_DIR` | Data directory | `./data/` (→ `/app/data`) |
| `UPTIME_KUMA_DB_POOL_MAX_CONNECTIONS` | DB pool | 10 |
| `NODE_ENV` | set to `production` (already set in image) | production |
| `SEEDE_ADMIN_USERNAME` | Admin created on boot if missing (never overwritten) | `a.mkwizu@seedexr.com` (compose default) |
| `SEEDE_ADMIN_PASSWORD` | Its initial password — **Coolify secret**, must not be "Too weak" or the admin is skipped (logged) | — |
| `RESEND_API_KEY` | Resend API key for alert + password-reset emails | — |
| `EMAIL_FROM` | Sender, used exactly as written. Custom name: `Seede XR <noreply@mail.seedexr.com>`; domain must be verified in Resend | — |
| `SEEDE_PRIMARY_BASE_URL` | Seeds Settings → Primary Base URL on first boot if empty (reset links, MCP URL) | — |

`RESEND_FROM_NAME` is no longer used (put the name in `EMAIL_FROM`). Password-reset emails also need
**Settings → General → Primary Base URL**. "Too weak" = fewer than 6 characters or only one kind of
character (needs two of: lowercase, uppercase, numbers, symbols).

DB type (SQLite vs external MariaDB) is chosen in the **setup wizard**, not via env,
and stored in `/app/data/db-config.json`.

## Not included in the lean image (add only if needed)
- Chromium → "real browser" monitor type + screenshots.
- Apprise notifications, cloudflared tunnel, embedded MariaDB.
Add the corresponding apt/pip packages to `Dockerfile.seede` if a deployment needs them.

## Verification
- Local: `docker build -f docker/Dockerfile.seede -t seedexr-monitor .` then
  `docker run -p 3001:3001 -v seede-data:/app/data seedexr-monitor` → open http://localhost:3001.
- Confirm the container reports healthy after the start-period.

## Public status domain vs in-house dashboard
Any hostname listed in a status page's **Domain Names** is public-only: `/` shows that
page, `/status/<slug>` shows other product pages, and the dashboard, login, `/metrics`
and socket.io are refused there. Serve the dashboard on a second hostname.
1. In Coolify add a second domain for the same service (e.g. `monitor.seedexr.com`,
   ideally behind VPN/Cloudflare Access), or keep using the generated sslip.io URL.
2. Log in on that hostname → Status Pages → your page → Domain Names → add
   `status.seedexr.com` → Save. Do this from the admin hostname, not from status.seedexr.com,
   or the session is cut off.
3. One status page per product (`/status/<product>`); optionally map a domain per product.

## Live setup (2026-10-09)
| Host | Role |
|------|------|
| `monitor.seedexr.com` | In-house dashboard (login, settings, `/mcp`, password reset). Primary Base URL. |
| `status.seedexr.com` | Public status page `seedexr-website` (Status Page → Domain Names). Dashboard/admin paths redirect to `/`, socket.io refused. |

Both domains are on the one Coolify app (`docker_compose_domains` of service `seedexr-monitor`);
DNS: Cloudflare A records → 69.169.103.33 (DNS only). Product pages: `status.seedexr.com/status/<slug>`.

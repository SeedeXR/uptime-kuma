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

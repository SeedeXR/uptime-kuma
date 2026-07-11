# Performance Profile

Method: Playwright + headless Chrome against the production build served by
`node server/server.js` (localhost, brotli enabled via `expressStaticGzip`).
Numbers are localhost (no network latency) — treat as relative, not field data.

## Initial load (SPA cold load)
| Metric | Value |
|--------|-------|
| DOM interactive | 52 ms |
| DOMContentLoaded | 133 ms |
| First Contentful Paint | 192 ms |
| Load complete | 209 ms |
| Requests | 10 |
| Transferred (compressed) | ~689 KB |

(Dashboard shows identical navigation-timing because routing is client-side —
SPA nav timing only reflects the first document load. FCP <200 ms locally is healthy.)

## Bundle weight
| Asset | Raw | Brotli (served) |
|-------|-----|-----------------|
| `index-*.js` (app + vendor) | 2.23 MB | **480 KB** |
| `index-*.css` | 323 KB | 35 KB |
| Space Grotesk (latin woff2, on-demand subset) | — | ~22 KB |
| PingChart chunk (lazy) | 180 KB | 55 KB (loaded only on monitor detail) |

## Observations
- **Fast paint, heavy JS.** FCP is quick, but the single ~480 KB (brotli) app+vendor
  chunk dominates transfer. This is **pre-existing upstream behaviour**, not introduced
  by the rebrand/features.
- **Rebrand cost is negligible.** Space Grotesk is self-hosted and unicode-range split;
  a browser fetches only the ~22 KB latin subset. The Users page + multi-admin handlers
  add a few KB. Icons are static assets.
- **Already-good defaults kept:** brotli + gzip precompression, lazy PingChart chunk,
  route-level code splitting for some pages, SQLite (low idle footprint).

## Recommendations (optional, not blocking)
1. **Split the vendor chunk** — the 2.23 MB raw `index.js` bundles all vendor libs.
   Vite `manualChunks` to separate vendor/app would improve caching and TTI on repeat
   visits. Upstream concern; safe to defer.
2. **Run Lighthouse in CI** for Core Web Vitals + accessibility/best-practices/SEO
   scores: `npx lighthouse http://localhost:3001 --preset=desktop`. Not run here
   (heavy dep + the bundled Chromium is OS-incompatible on this host).
3. **Resource footprint at runtime:** single Node process, SQLite by default. Tune
   `UPTIME_KUMA_DB_POOL_MAX_CONNECTIONS` (default 10) and consider external MariaDB
   only at high monitor counts.

## Optimizations applied (wave 2)

### 1. Lucide tree-shaking (biggest win)
The icon wrapper first used `import * as lucide` + dynamic lookup, which bundled **all
~1500 Lucide icons** → `index.js` = 2.64 MB raw / 461 KB brotli. Switched to **static
named imports** of only the ~45 icons used.

### 2. Vendor chunk splitting (`config/vite.config.js`)
Split rarely-changing eager libs into long-term-cacheable chunks (Vue, Bootstrap, core),
leaving lazy deps (chart.js via PingChart) to Vite's automatic splitting.

| Chunk (brotli) | Before | After |
|----------------|--------|-------|
| app `index.js` | 480 KB (monolithic, all libs + FA) | **335 KB** |
| `vendor-vue` | — | 94 KB (cached across deploys) |
| `vendor-bootstrap` | — | 21 KB (cached) |
| `vendor-core` | — | 16 KB (cached) |

Net: the app chunk that changes each deploy is **~30% smaller**, and ~131 KB of vendor code
is cached across app updates (faster repeat loads). Total transfer is similar but far better cached.

### 3. Robustness — SQLite
Confirmed the DB is already well-tuned: **WAL**, `busy_timeout=5000`, `synchronous=NORMAL`,
`cache_size=-12000`, `auto_vacuum=INCREMENTAL`. Left unchanged (single-connection default is
an intentional write-safety choice).
- **Under extreme concurrency** (the 143-test × 6-browser matrix), the single SQLite
  connection is the bottleneck → "Unable to acquire a connection". For high-monitor-count
  deployments, set `UPTIME_KUMA_SQLITE_SINGLE_CONNECTION=false` (multi-connection WAL) or use
  external MariaDB. Not changed by default (safety > throughput for typical installs).

## Reproduce
Playwright drives system Chrome via `PW_CHANNEL=chrome` here (bundled Chromium v119
crashes on this macOS). In CI/Linux the bundled browser works directly.

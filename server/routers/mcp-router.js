const express = require("express");
const axios = require("axios");
const { R } = require("redbean-node");
const { log, UP, DOWN, PENDING, MAINTENANCE } = require("../../src/util");
const { verifyAPIKey } = require("../auth");
const { apiRateLimiter } = require("../rate-limiter");
const { Settings } = require("../settings");
const { UptimeCalculator } = require("../uptime-calculator");
const { UptimeKumaServer } = require("../uptime-kuma-server");
const checkVersion = require("../check-version");
const { checkSlug } = require("../socket-handlers/status-page-socket-handler");

// Model Context Protocol over Streamable HTTP, stateless (JSON responses, no SSE stream).
// Auth: "Authorization: Bearer <token>" with an MCP token from Settings → MCP.
// ponytail: hand-rolled JSON-RPC (initialize/ping/tools); move to @modelcontextprotocol/sdk
// if we ever need resources, prompts or server-initiated messages.
const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];
const STATUS_NAME = { [UP]: "up", [DOWN]: "down", [PENDING]: "pending", [MAINTENANCE]: "maintenance" };

const idArg = {
    type: "object",
    properties: { id: { type: "integer", description: "Monitor ID (from list_monitors)" } },
    required: ["id"],
};

/**
 * Host of an Origin header, or null when it isn't a URL (e.g. "null" from sandboxed pages)
 * @param {string} origin Origin header
 * @returns {string|null} host[:port]
 */
function originHost(origin) {
    try {
        return new URL(origin).host;
    } catch {
        return null;
    }
}

/**
 * Latest heartbeat per monitor, keyed by monitor id. One indexed lookup per monitor
 * (monitor_id + time index) rather than a GROUP BY over the whole heartbeat table.
 * @returns {Promise<object>} { [monitorId]: heartbeat row }
 */
async function latestBeats() {
    const ids = await R.getCol("SELECT id FROM monitor");
    const rows = await Promise.all(
        ids.map((id) => R.getRow("SELECT monitor_id, status, time, msg, ping FROM heartbeat WHERE monitor_id = ? ORDER BY time DESC", [id]))
    );
    return Object.fromEntries(rows.filter(Boolean).map((r) => [r.monitor_id, r]));
}

/**
 * Compact monitor summary for tool output
 * @param {object} m monitor row
 * @param {object} beat latest heartbeat row (may be undefined)
 * @returns {Promise<object>} summary
 */
async function summarize(m, beat) {
    const uptime = await UptimeCalculator.getUptimeCalculator(m.id);
    return {
        id: m.id,
        name: m.name,
        type: m.type,
        target: m.url && m.url !== "https://" ? m.url : m.hostname || null,
        paused: !m.active,
        status: m.active ? STATUS_NAME[beat?.status] || "unknown" : "paused",
        lastCheck: beat?.time || null,
        lastMessage: beat?.msg || null,
        responseTimeMs: beat?.ping ?? null,
        uptime24h: Number((uptime.get24Hour().uptime * 100).toFixed(2)),
    };
}

/**
 * GET endpoints worth watching from an OpenAPI 3 / Swagger 2 JSON document
 * @param {string} specUrl Where the spec lives (relative server URLs resolve against it)
 * @param {string} baseUrl Optional API base URL override
 * @returns {Promise<object>} { baseUrl, endpoints, skipped }
 */
async function discoverEndpoints(specUrl, baseUrl) {
    if (!/^https?:\/\//i.test(specUrl || "")) {
        throw new Error("specUrl must be an http(s) URL to an OpenAPI/Swagger JSON document");
    }
    // ponytail: no private-address block on purpose (discovering in-house APIs is the point, and a
    // write token can already create monitors for any URL); write-scoped + capped instead
    const res = await axios.get(specUrl, { timeout: 10000, maxRedirects: 3, maxContentLength: 5 * 1024 * 1024, responseType: "text", transformResponse: (x) => x });
    let spec;
    try {
        spec = JSON.parse(res.data);
    } catch {
        throw new Error("The spec must be JSON (OpenAPI 3 or Swagger 2). For a YAML spec, pass its JSON URL (often /openapi.json or /v3/api-docs).");
    }
    if (!spec.paths) {
        throw new Error("No 'paths' found — is this an OpenAPI/Swagger document?");
    }

    if (!baseUrl) {
        const server = spec.servers?.[0];
        if (server?.url) {
            // Fill {variables} with their defaults, then resolve relative URLs against the spec location
            const url = server.url.replace(/\{(\w+)\}/g, (_, v) => server.variables?.[v]?.default ?? "");
            baseUrl = new URL(url, specUrl).href;
        } else if (spec.swagger) {
            const loc = new URL(specUrl);
            baseUrl = `${spec.schemes?.[0] || loc.protocol.slice(0, -1)}://${spec.host || loc.host}${spec.basePath || ""}`;
        } else {
            baseUrl = new URL(specUrl).origin;
        }
    }
    baseUrl = baseUrl.replace(/\/+$/, "");

    const endpoints = [];
    let skipped = 0;
    for (const [path, item] of Object.entries(spec.paths)) {
        const op = item?.get;
        if (!op) {
            continue;
        }
        const params = [...(item.parameters || []), ...(op.parameters || [])];
        // Paths with {params} or required query params can't be called without inventing values
        if (path.includes("{") || params.some((p) => p.required && p.in === "query")) {
            skipped++;
            continue;
        }
        endpoints.push({
            name: op.summary || op.operationId || `GET ${path}`,
            url: baseUrl + path,
            requiresAuth: !!(op.security ?? spec.security)?.length,
        });
    }
    return { baseUrl, endpoints: endpoints.slice(0, 100), skipped };
}

/**
 * Build the MCP router. Pause/resume come from server.js so monitor lifecycles stay in one place.
 * @param {{pauseMonitor: Function, startMonitor: Function, updateMonitorNotification: Function}} actions monitor functions from server.js
 * @returns {express.Router} router serving /mcp
 */
module.exports = function createMcpRouter({ pauseMonitor, startMonitor, updateMonitorNotification }) {
    const server = UptimeKumaServer.getInstance();

    /**
     * Create and start one HTTP(S) monitor with the same defaults as the dashboard form
     * @param {object} input { name, url, method, keyword, intervalSeconds }
     * @param {number} userID Owner (the token's user)
     * @returns {Promise<object>} { id, name, url }
     */
    async function createHttpMonitor(input, userID) {
        if (!input?.name || !/^https?:\/\//i.test(input.url || "")) {
            throw new Error("Each monitor needs a name and an http(s) url");
        }
        const interval = Math.min(Math.max(Number(input.intervalSeconds) || 60, 20), 86400);
        const bean = R.dispense("monitor");
        bean.import({
            name: String(input.name).slice(0, 150),
            description: "Created via MCP",
            type: input.keyword ? "keyword" : "http",
            url: input.url,
            method: ["GET", "HEAD", "POST"].includes(input.method) ? input.method : "GET",
            keyword: input.keyword || null,
            interval,
            retry_interval: interval,
            maxretries: 1,
            timeout: Math.round(interval * 0.8),
            accepted_statuscodes_json: JSON.stringify(["200-299"]),
            maxredirects: 10,
            active: 1,
            user_id: userID,
        });
        bean.validate();
        await R.store(bean);
        // Same as the dashboard: attach notifications marked "default enabled"
        const defaults = await R.getCol("SELECT id FROM notification WHERE is_default = 1");
        await updateMonitorNotification(bean.id, Object.fromEntries(defaults.map((id) => [id, true])));
        await startMonitor(userID, bean.id);
        await server.sendUpdateMonitorIntoList({ userID }, bean.id);
        return { id: bean.id, name: bean.name, url: bean.url };
    }

    const tools = [
        {
            name: "get_overview",
            description:
                "Whole-system health in one call: monitor counts by status, what is down and since when, average uptime, slowest services, TLS certificates expiring within 14 days and current maintenance.",
            inputSchema: { type: "object", properties: {} },
            annotations: { readOnlyHint: true },
            run: async () => {
                const beats = await latestBeats();
                const monitors = await R.getAll("SELECT id, name, type, url, hostname, active FROM monitor");
                const all = await Promise.all(monitors.map((m) => summarize(m, beats[m.id])));
                const active = all.filter((m) => !m.paused);
                const counts = {};
                for (const m of all) {
                    counts[m.status] = (counts[m.status] || 0) + 1;
                }
                const down = await Promise.all(
                    active
                        .filter((m) => m.status === "down")
                        .map(async (m) => ({
                            id: m.id,
                            name: m.name,
                            since: await R.getCell("SELECT time FROM heartbeat WHERE monitor_id = ? AND important = 1 AND status = ? ORDER BY time DESC", [m.id, DOWN]),
                            lastMessage: m.lastMessage,
                        }))
                );
                const pings = await Promise.all(
                    active.map(async (m) => ({ id: m.id, name: m.name, avgResponseMs24h: (await UptimeCalculator.getUptimeCalculator(m.id)).get24Hour().avgPing }))
                );
                const certs = [];
                for (const row of await R.getAll("SELECT monitor_tls_info.monitor_id, monitor.name, info_json FROM monitor_tls_info JOIN monitor ON monitor.id = monitor_tls_info.monitor_id")) {
                    const days = JSON.parse(row.info_json || "{}")?.certInfo?.daysRemaining;
                    if (typeof days === "number" && days <= 14) {
                        certs.push({ monitorId: row.monitor_id, name: row.name, daysRemaining: days });
                    }
                }
                const maintenance = [];
                for (const m of await R.find("maintenance", " active = 1 ")) {
                    const status = await m.getStatus();
                    if (status === "under-maintenance" || status === "scheduled") {
                        maintenance.push({ id: m.id, title: m.title, status });
                    }
                }
                const avg = (xs) => (xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)) : null);
                return {
                    overall: down.length ? "degraded" : maintenance.some((m) => m.status === "under-maintenance") ? "maintenance" : "operational",
                    totals: { monitors: all.length, ...counts },
                    averageUptime24h: avg(active.map((m) => m.uptime24h)),
                    down,
                    slowest: pings.filter((p) => p.avgResponseMs24h).sort((a, b) => b.avgResponseMs24h - a.avgResponseMs24h).slice(0, 5)
                        .map((p) => ({ ...p, avgResponseMs24h: Math.round(p.avgResponseMs24h) })),
                    certificatesExpiringSoon: certs,
                    maintenance,
                };
            },
        },
        {
            name: "list_monitors",
            description: "List every monitor with its current status (up/down/pending/maintenance/paused), last check and 24h uptime.",
            inputSchema: { type: "object", properties: {} },
            annotations: { readOnlyHint: true },
            run: async () => {
                const beats = await latestBeats();
                const monitors = await R.getAll("SELECT id, name, type, url, hostname, active FROM monitor ORDER BY name");
                return Promise.all(monitors.map((m) => summarize(m, beats[m.id])));
            },
        },
        {
            name: "get_monitor",
            description: "Details for one monitor: current status, 24h/30d uptime and its 20 most recent checks.",
            inputSchema: idArg,
            annotations: { readOnlyHint: true },
            run: async ({ id }) => {
                const m = await R.getRow("SELECT id, name, type, url, hostname, active, interval FROM monitor WHERE id = ?", [id]);
                if (!m) {
                    throw new Error(`No monitor with id ${id}`);
                }
                const recent = await R.getAll(
                    "SELECT status, time, msg, ping FROM heartbeat WHERE monitor_id = ? ORDER BY time DESC LIMIT 20",
                    [id]
                );
                const uptime = await UptimeCalculator.getUptimeCalculator(id);
                return {
                    ...(await summarize(m, recent[0])),
                    intervalSeconds: m.interval,
                    uptime30d: Number((uptime.get30Day().uptime * 100).toFixed(2)),
                    recentChecks: recent.map((b) => ({ status: STATUS_NAME[b.status] || "unknown", time: b.time, message: b.msg, responseTimeMs: b.ping })),
                };
            },
        },
        {
            name: "list_incidents",
            description: "Recent status changes (a monitor going down, recovering or entering maintenance), newest first.",
            inputSchema: {
                type: "object",
                properties: { limit: { type: "integer", minimum: 1, maximum: 100, description: "How many events (default 20)" } },
            },
            annotations: { readOnlyHint: true },
            run: async ({ limit = 20 }) => {
                const rows = await R.getAll(
                    `SELECT heartbeat.monitor_id, monitor.name, heartbeat.status, heartbeat.time, heartbeat.msg
                     FROM heartbeat JOIN monitor ON monitor.id = heartbeat.monitor_id
                     WHERE heartbeat.important = 1 ORDER BY heartbeat.time DESC LIMIT ?`,
                    [Math.min(Math.max(Number(limit) || 20, 1), 100)]
                );
                return rows.map((r) => ({ monitorId: r.monitor_id, monitor: r.name, status: STATUS_NAME[r.status] || "unknown", time: r.time, message: r.msg }));
            },
        },
        {
            name: "list_status_pages",
            description: "Public status pages with their URLs and custom domains.",
            inputSchema: { type: "object", properties: {} },
            annotations: { readOnlyHint: true },
            run: async () => {
                const base = ((await Settings.get("primaryBaseURL")) || "").replace(/\/+$/, "");
                const pages = await R.getAll("SELECT id, slug, title, published FROM status_page ORDER BY title");
                const domains = await R.getAll("SELECT status_page_id, domain FROM status_page_cname");
                return pages.map((p) => ({
                    slug: p.slug,
                    title: p.title,
                    published: !!p.published,
                    url: base ? `${base}/status/${p.slug}` : `/status/${p.slug}`,
                    domains: domains.filter((d) => d.status_page_id === p.id).map((d) => d.domain),
                }));
            },
        },
        {
            name: "pause_monitor",
            description: "Pause a monitor (stops checks and alerts until resumed). Needs a Read & write token.",
            inputSchema: idArg,
            write: true,
            run: async ({ id }, key) => {
                await pauseMonitor(key.user_id, id);
                await server.sendUpdateMonitorIntoList({ userID: key.user_id }, id);
                return { id, paused: true };
            },
        },
        {
            name: "discover_api_endpoints",
            description:
                "Read a system's OpenAPI 3 / Swagger 2 JSON spec and list the GET endpoints that can be watched without parameters (paths with {params} or required query params are skipped). Pass the ones you want to create_monitors. Needs a Read & write token (the server fetches the URL).",
            inputSchema: {
                type: "object",
                properties: {
                    specUrl: { type: "string", description: "URL of the OpenAPI/Swagger JSON, e.g. https://api.example.com/openapi.json" },
                    baseUrl: { type: "string", description: "Optional API base URL if the spec's servers entry is missing or wrong" },
                },
                required: ["specUrl"],
            },
            annotations: { openWorldHint: true },
            write: true,
            run: async ({ specUrl, baseUrl }) => discoverEndpoints(specUrl, baseUrl),
        },
        {
            name: "create_monitors",
            description: "Create HTTP(S) monitors (up to 50 per call), e.g. from discover_api_endpoints. Each starts checking immediately and gets your default notifications. Needs a Read & write token.",
            inputSchema: {
                type: "object",
                properties: {
                    monitors: {
                        type: "array",
                        maxItems: 50,
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                url: { type: "string", description: "http(s) URL to check" },
                                method: { type: "string", enum: ["GET", "HEAD", "POST"] },
                                keyword: { type: "string", description: "Optional text the response must contain" },
                                intervalSeconds: { type: "integer", minimum: 20, maximum: 86400, description: "Default 60" },
                            },
                            required: ["name", "url"],
                        },
                    },
                },
                required: ["monitors"],
            },
            write: true,
            run: async ({ monitors }, key) => {
                if (!Array.isArray(monitors) || monitors.length === 0 || monitors.length > 50) {
                    throw new Error("Pass 1–50 monitors");
                }
                const results = [];
                for (const m of monitors) {
                    try {
                        results.push({ ok: true, ...(await createHttpMonitor(m, key.user_id)) });
                    } catch (e) {
                        results.push({ ok: false, name: m?.name, error: e.message });
                    }
                }
                return results;
            },
        },
        {
            name: "create_status_page",
            description: "Create a public status page, optionally listing monitors in one group. Returns its URL. Needs a Read & write token.",
            inputSchema: {
                type: "object",
                properties: {
                    slug: { type: "string", description: "URL slug: letters, numbers and dashes, e.g. 'seede-arena'" },
                    title: { type: "string" },
                    description: { type: "string" },
                    monitorIds: { type: "array", items: { type: "integer" }, description: "Monitors to show (from list_monitors)" },
                    groupName: { type: "string", description: "Group heading for those monitors (default 'Services')" },
                },
                required: ["slug", "title"],
            },
            write: true,
            run: async ({ slug, title, description, monitorIds = [], groupName }) => {
                slug = String(slug || "").trim().toLowerCase();
                checkSlug(slug);
                if (!String(title || "").trim()) {
                    throw new Error("title is required");
                }
                if (await R.findOne("status_page", " slug = ? ", [slug])) {
                    throw new Error(`A status page with slug '${slug}' already exists`);
                }
                const known = new Set(await R.getCol("SELECT id FROM monitor"));
                const missing = monitorIds.filter((id) => !known.has(id));
                if (missing.length) {
                    throw new Error(`Unknown monitor ids: ${missing.join(", ")}`);
                }

                const page = R.dispense("status_page");
                page.slug = slug;
                page.title = String(title).trim();
                page.description = description || null;
                page.theme = "dark";
                page.icon = "";
                page.autoRefreshInterval = 300;
                await R.store(page);

                if (monitorIds.length) {
                    const group = R.dispense("group");
                    group.name = groupName || "Services";
                    group.public = true;
                    group.active = true;
                    group.weight = 1;
                    group.status_page_id = page.id;
                    await R.store(group);
                    for (const [i, id] of monitorIds.entries()) {
                        await R.exec("INSERT INTO monitor_group (monitor_id, group_id, weight) VALUES (?, ?, ?)", [id, group.id, i + 1]);
                    }
                }
                const base = ((await Settings.get("primaryBaseURL")) || "").replace(/\/+$/, "");
                return { slug, title: page.title, url: `${base}/status/${slug}`, monitors: monitorIds.length };
            },
        },
        {
            name: "resume_monitor",
            description: "Resume a paused monitor. Needs a Read & write token.",
            inputSchema: idArg,
            write: true,
            run: async ({ id }, key) => {
                await startMonitor(key.user_id, id);
                await server.sendUpdateMonitorIntoList({ userID: key.user_id }, id);
                return { id, paused: false };
            },
        },
    ];

    /**
     * Handle one JSON-RPC message
     * @param {object} msg JSON-RPC request or notification
     * @param {object} key verified api_key row
     * @returns {Promise<object|null>} response, or null for notifications
     */
    async function handle(msg, key) {
        const reply = (result) => ({ jsonrpc: "2.0", id: msg.id, result });
        const fail = (code, message) => ({ jsonrpc: "2.0", id: msg?.id ?? null, error: { code, message } });

        if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
            return fail(-32600, "Invalid Request");
        }
        if (msg.id === undefined) {
            return null; // notification (e.g. notifications/initialized): nothing to send back
        }

        switch (msg.method) {
            case "initialize": {
                const asked = msg.params?.protocolVersion;
                return reply({
                    protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
                    capabilities: { tools: { listChanged: false } },
                    serverInfo: { name: "seede-xr-monitor", title: "Seede XR Monitor", version: checkVersion.version },
                    instructions: "Uptime monitoring for Seede XR. Start with list_monitors; use list_incidents for recent outages.",
                });
            }
            case "ping":
                return reply({});
            case "tools/list":
                return reply({
                    tools: tools
                        .filter((t) => !t.write || key.scope === "mcp-write")
                        .map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations })),
                });
            case "tools/call": {
                const tool = tools.find((t) => t.name === msg.params?.name);
                if (!tool) {
                    return fail(-32602, `Unknown tool: ${msg.params?.name}`);
                }
                try {
                    if (tool.write && key.scope !== "mcp-write") {
                        throw new Error("This token is read-only. Create a Read & write token in Settings → MCP.");
                    }
                    const data = await tool.run(msg.params.arguments || {}, key);
                    return reply({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
                } catch (e) {
                    // Tool errors are results the model can read, not protocol errors
                    return reply({ content: [{ type: "text", text: e.message }], isError: true });
                }
            }
            default:
                return fail(-32601, `Method not found: ${msg.method}`);
        }
    }

    const router = express.Router();

    router.post("/mcp", async (req, res) => {
        // DNS-rebinding guard (MCP spec): CLI clients send no Origin; a browser's Origin must be our own
        // configured address — comparing to the Host header is useless since rebinding controls both
        if (req.headers.origin) {
            const ours = originHost((await Settings.get("primaryBaseURL")) || "");
            if (!ours || originHost(req.headers.origin) !== ours) {
                return res.status(403).json({ error: "Origin not allowed" });
            }
        }

        const bearer = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "")?.[1];
        if (!(await apiRateLimiter.pass(null, 0))) {
            return res.status(429).json({ error: "Too many requests" });
        }
        const key = bearer ? await verifyAPIKey(bearer) : false;
        if (!key || !String(key.scope).startsWith("mcp-")) {
            await apiRateLimiter.removeTokens(1); // only failed attempts count, like /metrics
            log.warn("mcp", "Rejected MCP request: missing or invalid token");
            res.set("WWW-Authenticate", 'Bearer realm="seede-xr-mcp"');
            return res.status(401).json({ error: "A valid MCP token is required (Settings → MCP)" });
        }

        const batch = Array.isArray(req.body);
        const replies = (await Promise.all((batch ? req.body : [req.body]).map((m) => handle(m, key)))).filter(Boolean);
        if (replies.length === 0) {
            return res.status(202).end();
        }
        res.json(batch ? replies : replies[0]);
    });

    // Stateless server: no server-to-client SSE stream and no sessions to delete
    router.all("/mcp", (req, res) => res.set("Allow", "POST").status(405).end());

    return router;
};

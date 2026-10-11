// Dashboard parity for MCP: run the dashboard's own socket handlers for a token's user, so every
// MCP write goes through exactly the code (validation, side effects, live dashboard updates) that
// a click in the UI does. Anything the dashboard guards with the user's password (settings, users,
// 2FA, API/MCP tokens) or that manages sessions stays dashboard-only.
const en = require("../src/lang/en.json");

const TIMEOUT_MS = 60000;

/**
 * Allowed actions: socket event → { write, params, about }. `write` = needs a Read & write token
 * (state changes, or reads that expose secrets such as credentials). `params` lists the arguments
 * in order, as the dashboard sends them.
 */
const ACTIONS = {
    // Monitors
    getMonitor: { write: true, params: ["monitorID"], about: "Full monitor config as the edit form loads it (includes credentials)" },
    add: { write: true, params: ["monitor"], about: "Create a monitor from a full monitor object (shape: getMonitor's result without id)" },
    editMonitor: { write: true, params: ["monitor"], about: "Save a full monitor object (load it with getMonitor, change fields, send it back)" },
    deleteMonitor: { write: true, params: ["monitorID", "deleteChildren"], about: "Delete a monitor (deleteChildren: also delete a group's children)" },
    pauseMonitor: { write: true, params: ["monitorID"], about: "Pause a monitor" },
    resumeMonitor: { write: true, params: ["monitorID"], about: "Resume a monitor" },
    getMonitorBeats: { write: false, params: ["monitorID", "period"], about: "Heartbeats for the last <period> hours" },
    getMonitorChartData: { write: false, params: ["monitorID", "period"], about: "Response-time chart data for the last <period> hours" },
    monitorImportantHeartbeatListCount: { write: false, params: ["monitorID"], about: "Number of status-change events (monitorID null = all)" },
    monitorImportantHeartbeatListPaged: { write: false, params: ["monitorID", "offset", "count"], about: "Status-change events, paged" },
    clearEvents: { write: true, params: ["monitorID"], about: "Delete a monitor's status-change events" },
    clearHeartbeats: { write: true, params: ["monitorID"], about: "Delete a monitor's heartbeat history" },
    clearStatistics: { write: true, params: [], about: "Delete all heartbeats and statistics for every monitor" },
    checkDomain: { write: false, params: ["partial"], about: "Domain-expiry support check for { type, url, hostname, grpcUrl }" },
    getPushExample: { write: false, params: ["language"], about: "Push-monitor code example for a language (e.g. 'bash-curl')" },
    getGameList: { write: false, params: [], about: "Games supported by the game-server monitor" },
    getPM2ProcessList: { write: true, params: [], about: "PM2 processes on the server (system-service monitor)" },

    // Tags
    getTags: { write: false, params: [], about: "All tags" },
    addTag: { write: true, params: ["tag"], about: "Create a tag { name, color }" },
    editTag: { write: true, params: ["tag"], about: "Edit a tag { id, name, color }" },
    deleteTag: { write: true, params: ["tagID"], about: "Delete a tag" },
    addMonitorTag: { write: true, params: ["tagID", "monitorID", "value"], about: "Attach a tag to a monitor" },
    editMonitorTag: { write: true, params: ["tagID", "monitorID", "value"], about: "Change a monitor tag's value" },
    deleteMonitorTag: { write: true, params: ["tagID", "monitorID", "value"], about: "Detach a tag from a monitor" },

    // Notifications, proxies, Docker hosts, remote browsers
    getNotificationList: { write: true, params: [], about: "All notifications with their full config (includes credentials)" },
    addNotification: { write: true, params: ["notification", "notificationID"], about: "Create (notificationID null) or update a notification" },
    deleteNotification: { write: true, params: ["notificationID"], about: "Delete a notification" },
    testNotification: { write: true, params: ["notification"], about: "Send a test message with a notification config" },
    checkApprise: { write: false, params: [], about: "Whether Apprise is installed" },
    getProxyList: { write: true, params: [], about: "All proxies (includes credentials)" },
    addProxy: { write: true, params: ["proxy", "proxyID"], about: "Create (proxyID null) or update a proxy" },
    deleteProxy: { write: true, params: ["proxyID"], about: "Delete a proxy" },
    getDockerHostList: { write: false, params: [], about: "All Docker hosts" },
    addDockerHost: { write: true, params: ["dockerHost", "dockerHostID"], about: "Create (dockerHostID null) or update a Docker host" },
    deleteDockerHost: { write: true, params: ["dockerHostID"], about: "Delete a Docker host" },
    testDockerHost: { write: true, params: ["dockerHost"], about: "Test a Docker host connection" },
    getRemoteBrowserList: { write: true, params: [], about: "All remote browsers (URLs may include tokens)" },
    addRemoteBrowser: { write: true, params: ["remoteBrowser", "remoteBrowserID"], about: "Create (id null) or update a remote browser" },
    deleteRemoteBrowser: { write: true, params: ["remoteBrowserID"], about: "Delete a remote browser" },
    testRemoteBrowser: { write: true, params: ["remoteBrowser"], about: "Test a remote browser" },

    // Status pages and incidents
    getStatusPage: { write: false, params: ["slug"], about: "Status page config (the editor's view)" },
    addStatusPage: { write: true, params: ["title", "slug"], about: "Create an empty status page" },
    saveStatusPage: { write: true, params: ["slug", "config", "imgDataUrl", "publicGroupList"], about: "Save a whole status page (config + groups); prefer update_status_page / the group tools" },
    deleteStatusPage: { write: true, params: ["slug"], about: "Delete a status page" },
    getIncidentHistory: { write: false, params: ["slug", "cursor"], about: "Incident history, paged by cursor (null = newest)" },
    postIncident: { write: true, params: ["slug", "incident"], about: "Post an incident { title, content, style: info|warning|danger|primary|light|dark }" },
    editIncident: { write: true, params: ["slug", "incidentID", "incident"], about: "Edit an incident" },
    resolveIncident: { write: true, params: ["slug", "incidentID"], about: "Mark an incident resolved" },
    unpinIncident: { write: true, params: ["slug"], about: "Unpin the page's active incident" },
    deleteIncident: { write: true, params: ["slug", "incidentID"], about: "Delete an incident" },

    // Maintenance
    getMaintenanceList: { write: false, params: [], about: "All maintenance windows with their status" },
    getMaintenance: { write: false, params: ["maintenanceID"], about: "One maintenance window" },
    getMonitorMaintenance: { write: false, params: ["maintenanceID"], about: "Monitors affected by a maintenance window" },
    getMaintenanceStatusPage: { write: false, params: ["maintenanceID"], about: "Status pages showing a maintenance window" },
    addMaintenance: { write: true, params: ["maintenance"], about: "Create a maintenance window (shape: getMaintenance's result without id)" },
    editMaintenance: { write: true, params: ["maintenance"], about: "Save a full maintenance object" },
    addMonitorMaintenance: { write: true, params: ["maintenanceID", "monitors"], about: "Set affected monitors: [{ id }]" },
    addMaintenanceStatusPage: { write: true, params: ["maintenanceID", "statusPages"], about: "Set status pages: [{ id }]" },
    pauseMaintenance: { write: true, params: ["maintenanceID"], about: "Pause a maintenance window" },
    resumeMaintenance: { write: true, params: ["maintenanceID"], about: "Resume a maintenance window" },
    deleteMaintenance: { write: true, params: ["maintenanceID"], about: "Delete a maintenance window" },

    // Database
    getDatabaseSize: { write: false, params: [], about: "Database size" },
    shrinkDatabase: { write: true, params: [], about: "VACUUM the database" },
};

// Lists the dashboard receives as pushes rather than replies: reuse the dashboard's own builders
// (lazy require: they need the running server). The send* helpers also refresh open dashboards.
const LIST_READERS = {
    getNotificationList: (socket) => require("./client").sendNotificationList(socket),
    getProxyList: (socket) => require("./client").sendProxyList(socket),
    getDockerHostList: (socket) => require("./client").sendDockerHostList(socket),
    getRemoteBrowserList: (socket) => require("./client").sendRemoteBrowserList(socket),
    getMaintenanceList: async (socket) =>
        Object.values(await require("./uptime-kuma-server").UptimeKumaServer.getInstance().getMaintenanceJSONList(socket.userID)),
};

// One stand-in session per user: handlers are registered once, then reused for every call
const sockets = new Map();

/**
 * A server-side stand-in for a logged-in dashboard connection. Handlers only need `userID` (their
 * checkLogin), `on`, `emit`, room calls and the client address; pushes to the dashboard still go
 * out through io.to(userID), so open dashboards update live.
 * @param {number} userID The token owner's user id
 * @returns {object} socket-like object; `handlers` holds the registered event handlers
 */
function createVirtualSocket(userID) {
    const handlers = new Map();
    return {
        id: `mcp-${userID}`,
        userID,
        handlers,
        on: (event, fn) => handlers.set(event, fn),
        emit: () => {},
        join: () => {},
        leave: () => {},
        disconnect: () => {},
        client: { conn: { remoteAddress: "mcp", request: { headers: {} } } },
    };
}

/**
 * Human-readable message: dashboard handlers reply with en.json keys (e.g. "successEdited")
 * @param {object} res Handler reply
 * @returns {object} reply with msg translated when it is a key
 */
function readable(res) {
    return res && res.msgi18n && en[res.msg] ? { ...res, msg: en[res.msg], msgi18n: undefined } : res;
}

/**
 * Call a registered handler with positional args, putting the callback where the handler expects it
 * (its last declared parameter) even when fewer args are passed.
 * @param {Function} fn Socket handler
 * @param {Array} args Positional arguments (without callback)
 * @param {number} timeoutMs Give up after this long
 * @returns {Promise<object>} the handler's reply
 */
function callHandler(fn, args, timeoutMs = TIMEOUT_MS) {
    const slots = Math.max(fn.length - 1, 0);
    const padded = [...args.slice(0, slots), ...Array(Math.max(slots - args.length, 0)).fill(undefined)];
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("The action did not answer in time")), timeoutMs);
        Promise.resolve(
            fn(...padded, (res) => {
                clearTimeout(timer);
                resolve(readable(res));
            })
        ).catch((e) => {
            clearTimeout(timer);
            reject(e);
        });
    });
}

/**
 * Run a dashboard action as the token's user
 * @param {Function} registerHandlers server.js connection handler (registers every socket handler)
 * @param {object} key verified api_key row (user_id, scope)
 * @param {string} action Action name (see ACTIONS)
 * @param {Array} args Positional arguments
 * @returns {Promise<object>} the handler's reply ({ ok, msg, ...data })
 */
async function runAction(registerHandlers, key, action, args = []) {
    const spec = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : null;
    if (!spec) {
        throw new Error(`Unknown or dashboard-only action '${action}'. See list_ui_actions.`);
    }
    if (spec.write && key.scope !== "mcp-write") {
        throw new Error(`'${action}' needs a Read & write token (Settings → MCP).`);
    }
    if (!Array.isArray(args)) {
        throw new Error("args must be an array of positional arguments");
    }
    let socket = sockets.get(key.user_id);
    if (!socket) {
        socket = createVirtualSocket(key.user_id);
        await registerHandlers(socket);
        sockets.set(key.user_id, socket);
    }
    if (LIST_READERS[action]) {
        return { ok: true, list: await LIST_READERS[action](socket) };
    }
    const fn = socket.handlers.get(action);
    if (!fn) {
        throw new Error(`Action '${action}' is not available on this server`);
    }
    return callHandler(fn, args);
}

module.exports = { ACTIONS, LIST_READERS, createVirtualSocket, callHandler, readable, runAction };

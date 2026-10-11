const { describe, test } = require("node:test");
const assert = require("node:assert");
const { ACTIONS, LIST_READERS, callHandler, readable, runAction } = require("../../server/mcp-ui-actions");
const { addToGroups } = require("../../server/routers/mcp-router");

// Socket events the dashboard protects with the user's password, or that manage sessions/accounts
const DASHBOARD_ONLY = [
    "login", "loginByToken", "logout", "setup", "needSetup", "changePassword", "prepare2FA", "save2FA",
    "disable2FA", "verifyToken", "twoFAStatus", "secureConnect", "requestPasswordReset", "resetPasswordWithToken",
    "addUser", "deleteUser", "resetUserPassword", "setUserActive", "getUserList", "addAPIKey", "deleteAPIKey",
    "disableAPIKey", "enableAPIKey", "getAPIKeyList", "disconnectOtherSocketClients", "setSettings", "getSettings",
];

const readKey = { user_id: 7, scope: "mcp-read" };
const writeKey = { user_id: 7, scope: "mcp-write" };

describe("MCP dashboard actions", () => {
    test("catalog never exposes account, session, token or settings actions", () => {
        for (const event of DASHBOARD_ONLY) {
            assert.ok(!Object.hasOwn(ACTIONS, event), `${event} must stay dashboard-only`);
        }
    });

    test("reads that expose credentials need a Read & write token", () => {
        for (const action of ["getMonitor", "getNotificationList", "getProxyList", "getRemoteBrowserList"]) {
            assert.strictEqual(ACTIONS[action].write, true, action);
        }
        for (const action of Object.keys(LIST_READERS)) {
            assert.ok(Object.hasOwn(ACTIONS, action), `list reader ${action} must be in the catalog`);
        }
    });

    test("callHandler puts the callback in the handler's last slot even when args are missing", async () => {
        const seen = [];
        const handler = async (a, b, callback) => {
            seen.push(a, b);
            callback({ ok: true });
        };
        assert.deepStrictEqual(await callHandler(handler, [1]), { ok: true });
        assert.deepStrictEqual(seen, [1, undefined]);
    });

    test("callHandler times out when a handler never answers", async () => {
        await assert.rejects(callHandler(async (cb) => {}, [], 50), /did not answer in time/);
    });

    test("i18n message keys come back as readable English", () => {
        assert.deepStrictEqual(readable({ ok: true, msg: "successAdded", msgi18n: true }), { ok: true, msg: "Added Successfully.", msgi18n: undefined });
        assert.deepStrictEqual(readable({ ok: false, msg: "plain text" }), { ok: false, msg: "plain text" });
    });

    test("runAction enforces the catalog and token scope before touching any handler", async () => {
        let registered = 0;
        const register = async () => registered++;
        await assert.rejects(runAction(register, writeKey, "setSettings", []), /dashboard-only/);
        await assert.rejects(runAction(register, readKey, "deleteMonitor", [1]), /Read & write token/);
        await assert.rejects(runAction(register, writeKey, "pauseMonitor", 5), /args must be an array/);
        assert.strictEqual(registered, 0);
    });

    test("runAction runs the real handler as the token's user", async () => {
        const register = async (socket) => socket.on("getTags", (callback) => callback({ ok: true, userID: socket.userID }));
        assert.deepStrictEqual(await runAction(register, readKey, "getTags", []), { ok: true, userID: 7 });
    });

    test("addToGroups: nothing to add never creates a group (regression)", () => {
        const groups = [{ name: "Services", monitorList: [{ id: 1 }] }];
        const res = addToGroups(groups, [1], "Storage");
        assert.deepStrictEqual(res, { group: null, added: [], alreadyOnPage: [1], noChange: true });
        assert.deepStrictEqual(groups.map((g) => g.name), ["Services"]);
    });

    test("addToGroups: default first group, new named group only when needed, skips monitors on the page", () => {
        const groups = [{ name: "Services", monitorList: [{ id: 1 }] }, { name: "Infra", monitorList: [] }];
        assert.deepStrictEqual(addToGroups(groups, [2], undefined), { group: "Services", added: [2], alreadyOnPage: [] });
        assert.deepStrictEqual(addToGroups(groups, [3, 1], "APIs"), { group: "APIs", added: [3], alreadyOnPage: [1] });
        assert.deepStrictEqual(groups.map((g) => [g.name, g.monitorList.map((m) => m.id)]), [["Services", [1, 2]], ["Infra", []], ["APIs", [3]]]);
    });
});

import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot } from "../util-test";

/**
 * Log in and create an MCP token in Settings → MCP
 * @param {Page} page Page
 * @param {boolean} write Read & write instead of read only
 * @returns {Promise<string>} the token
 */
async function createToken(page, write) {
    await page.goto("./");
    await login(page);
    await expect(page.getByPlaceholder("Username")).toBeHidden(); // auth settled
    await page.goto("./settings/mcp");
    await page.getByTestId("mcp-token-name").fill(write ? "e2e-write" : "e2e");
    if (write) {
        await page.getByText("Read & write", { exact: true }).first().click();
    }
    await page.getByTestId("mcp-create-token").click();
    return page.getByTestId("mcp-new-token").locator("input").first().inputValue();
}

/**
 * MCP client bound to a token: rpc() for raw methods, tool() for successful tool calls,
 * toolError() for calls that must fail
 * @param {APIRequestContext} request Request context
 * @param {string} token MCP token
 * @returns {object} { rpc, tool, toolError }
 */
function mcp(request, token) {
    const rpc = async (method, params) => {
        const res = await request.post("./mcp", { headers: { Authorization: `Bearer ${token}` }, data: { jsonrpc: "2.0", id: 1, method, params } });
        return (await res.json()).result;
    };
    const callTool = (name, args) => rpc("tools/call", { name, arguments: args });
    return {
        rpc,
        tool: async (name, args = {}) => {
            const result = await callTool(name, args);
            expect(result.isError, result.content[0].text).toBeFalsy();
            return JSON.parse(result.content[0].text);
        },
        toolError: async (name, args = {}) => {
            const result = await callTool(name, args);
            expect(result.isError, `${name} should have failed`).toBe(true);
            return result.content[0].text;
        },
    };
}

test.describe("MCP and password reset", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
    });

    test("a read-only MCP token created in Settings works against /mcp", async ({ page, request }) => {
        const token = await createToken(page, false);
        expect(token).toMatch(/^uk\d+_/);
        const { rpc, tool, toolError } = mcp(request, token);

        const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } });
        expect(init.serverInfo.name).toBe("seede-xr-monitor");

        const names = (await rpc("tools/list")).tools.map((t) => t.name);
        expect(names).toContain("get_overview");
        expect(names).toContain("ui_action"); // reads allowed; writes checked per action
        expect(names).not.toContain("create_monitors");
        expect(names).not.toContain("update_monitor");

        expect((await tool("ui_action", { action: "getTags" })).ok).toBe(true);
        expect(await toolError("ui_action", { action: "addTag", args: [{ name: "x", color: "#000000" }] })).toContain("Read & write");

        expect((await request.post("./mcp", { data: { jsonrpc: "2.0", id: 1, method: "ping" } })).status()).toBe(401);
    });

    test("a read & write token can add monitors to an existing status page", async ({ page, request }) => {
        const { tool } = mcp(request, await createToken(page, true));

        const [monitor] = await tool("create_monitors", { monitors: [{ name: "e2e target", url: "http://127.0.0.1:9/" }] });
        await tool("create_status_page", { slug: "e2e-add", title: "E2E add" });

        const first = await tool("add_monitors_to_status_page", { slug: "e2e-add", monitorIds: [monitor.id], groupName: "APIs" });
        expect(first.added).toEqual([monitor.id]);
        const again = await tool("add_monitors_to_status_page", { slug: "e2e-add", monitorIds: [monitor.id] });
        expect(again.alreadyOnPage).toEqual([monitor.id]); // safe to repeat, no duplicates
    });

    test("everything the dashboard does to monitors and status pages works over MCP", async ({ page, request }) => {
        const { tool, toolError } = mcp(request, await createToken(page, true));

        // Monitors: rename through the dashboard's edit handler keeps every other field
        const [monitor] = await tool("create_monitors", { monitors: [{ name: "API health (Postgres, Redis)", url: "http://127.0.0.1:9/health" }] });
        const renamed = await tool("update_monitor", { id: monitor.id, changes: { name: "Njozi · API" } });
        expect(renamed.changed.name).toBe("Njozi · API");
        const details = await tool("get_monitor", { id: monitor.id });
        expect(details.name).toBe("Njozi · API");
        expect(details.target).toBe("http://127.0.0.1:9/health");

        // Status page settings and groups
        await tool("create_status_page", { slug: "e2e-parity", title: "https://seedexr.com", monitorIds: [monitor.id], groupName: "Services" });
        await tool("update_status_page", { slug: "e2e-parity", title: "Seede XR Status" });
        expect((await tool("ui_action", { action: "getStatusPage", args: ["e2e-parity"] })).config.title).toBe("Seede XR Status");

        // Regression: nothing to add must not create an empty group
        const noop = await tool("add_monitors_to_status_page", { slug: "e2e-parity", monitorIds: [monitor.id], groupName: "Storage" });
        expect(noop.added).toEqual([]);
        const groupNames = async () => (await (await request.get("./api/status-page/e2e-parity")).json()).publicGroupList.map((g) => g.name);
        expect(await groupNames()).toEqual(["Services"]);

        await tool("rename_status_page_group", { slug: "e2e-parity", groupName: "Services", newName: "Platform" });
        expect(await groupNames()).toEqual(["Platform"]);
        expect((await tool("remove_monitors_from_status_page", { slug: "e2e-parity", monitorIds: [monitor.id] })).removed).toEqual([monitor.id]);
        expect((await tool("delete_status_page_group", { slug: "e2e-parity", groupName: "Platform" })).deletedGroup).toBe("Platform");
        expect(await groupNames()).toEqual([]);
        expect(await toolError("delete_status_page_group", { slug: "e2e-parity", groupName: "Platform" })).toContain("No group");

        // Generic dashboard actions, and the dashboard-only boundary
        expect((await tool("ui_action", { action: "addTag", args: [{ name: "e2e-tag", color: "#ff0000" }] })).ok).toBe(true);
        expect((await tool("ui_action", { action: "getTags" })).tags.map((t) => t.name)).toContain("e2e-tag");
        expect(await toolError("ui_action", { action: "setSettings", args: [{}, "x"] })).toContain("dashboard-only");

        await tool("delete_status_page", { slug: "e2e-parity" });
        await tool("delete_monitor", { id: monitor.id });
        expect(await toolError("get_monitor", { id: monitor.id })).toContain("No monitor");
    });

    test("forgot password answers the same for any email", async ({ page }) => {
        await page.goto("./forgot-password");
        await page.getByPlaceholder("Email").fill("nobody@example.com");
        await page.getByRole("button", { name: "Send reset link" }).click();
        await expect(page.getByText("Check your email")).toBeVisible();
    });
});

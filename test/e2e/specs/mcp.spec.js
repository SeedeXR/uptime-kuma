import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot } from "../util-test";

test.describe("MCP and password reset", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
    });

    test("a read-only MCP token created in Settings works against /mcp", async ({ page, request }) => {
        await page.goto("./");
        await login(page);
        await expect(page.getByPlaceholder("Username")).toBeHidden(); // auth settled

        await page.goto("./settings/mcp");
        await page.getByTestId("mcp-token-name").fill("e2e");
        await page.getByTestId("mcp-create-token").click();
        const token = await page.getByTestId("mcp-new-token").locator("input").first().inputValue();
        expect(token).toMatch(/^uk\d+_/);

        const call = async (method, params) => {
            const res = await request.post("./mcp", {
                headers: { Authorization: `Bearer ${token}` },
                data: { jsonrpc: "2.0", id: 1, method, params },
            });
            return (await res.json()).result;
        };
        const init = await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } });
        expect(init.serverInfo.name).toBe("seede-xr-monitor");

        const names = (await call("tools/list")).tools.map((t) => t.name);
        expect(names).toContain("get_overview");
        expect(names).not.toContain("create_monitors"); // read-only token

        expect((await request.post("./mcp", { data: { jsonrpc: "2.0", id: 1, method: "ping" } })).status()).toBe(401);
    });

    test("a read & write token can add monitors to an existing status page", async ({ page, request }) => {
        await page.goto("./");
        await login(page);
        await expect(page.getByPlaceholder("Username")).toBeHidden();

        await page.goto("./settings/mcp");
        await page.getByTestId("mcp-token-name").fill("e2e-write");
        await page.getByText("Read & write", { exact: true }).first().click();
        await page.getByTestId("mcp-create-token").click();
        const token = await page.getByTestId("mcp-new-token").locator("input").first().inputValue();

        const tool = async (name, args) => {
            const res = await request.post("./mcp", {
                headers: { Authorization: `Bearer ${token}` },
                data: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
            });
            const result = (await res.json()).result;
            expect(result.isError, result.content[0].text).toBeFalsy();
            return JSON.parse(result.content[0].text);
        };

        const [monitor] = await tool("create_monitors", { monitors: [{ name: "e2e target", url: "http://127.0.0.1:9/" }] });
        await tool("create_status_page", { slug: "e2e-add", title: "E2E add" });

        const first = await tool("add_monitors_to_status_page", { slug: "e2e-add", monitorIds: [monitor.id], groupName: "APIs" });
        expect(first.added).toEqual([monitor.id]);
        const again = await tool("add_monitors_to_status_page", { slug: "e2e-add", monitorIds: [monitor.id] });
        expect(again.alreadyOnPage).toEqual([monitor.id]); // safe to repeat, no duplicates
    });

    test("forgot password answers the same for any email", async ({ page }) => {
        await page.goto("./forgot-password");
        await page.getByPlaceholder("Email").fill("nobody@example.com");
        await page.getByRole("button", { name: "Send reset link" }).click();
        await expect(page.getByText("Check your email")).toBeVisible();
    });
});

import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot } from "../util-test";

test.describe("Shared admin workspace", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
    });

    test("a second admin sees a monitor created by the first", async ({ page }) => {
        // Admin A: log in and create a monitor
        await page.goto("./");
        await login(page);
        await expect(page.getByPlaceholder("Username")).toBeHidden(); // auth settled (viewport-agnostic)

        await page.goto("./add");
        await expect(page.getByTestId("monitor-type-select")).toBeVisible();
        await page.getByTestId("monitor-type-select").selectOption("http");
        await page.getByTestId("friendly-name-input").fill("shared-monitor");
        await page.getByTestId("url-input").fill("https://www.example.com/");
        await page.getByTestId("save-button").click();
        // Monitor detail page shows the name (works on desktop + mobile layouts)
        await expect(page.getByText("shared-monitor").first()).toBeVisible();

        // Admin A: add a second admin
        await page.goto("./settings/users");
        await expect(page.getByTestId("current-password")).toBeVisible();
        await page.getByTestId("current-password").fill("admin123");
        await page.getByTestId("new-username").fill("second");
        await page.getByTestId("new-password").fill("SuperSecret123!");
        await page.getByTestId("add-user-button").click();
        await expect(page.getByTestId("user-username").filter({ hasText: "second" })).toBeVisible();

        // Log out and log in as the second admin
        await page.evaluate(() => window.localStorage.clear());
        await page.goto("./");
        await page.getByPlaceholder("Username").fill("second");
        await page.getByPlaceholder("Password", { exact: true }).fill("SuperSecret123!");
        await page.getByLabel("Remember me").check();
        await page.getByRole("button", { name: "Log in" }).click();
        await expect(page.getByPlaceholder("Username")).toBeHidden();

        // The second admin must see the monitor created by the first (shared workspace)
        await page.goto("./list");
        await expect(page.getByText("shared-monitor").first()).toBeVisible();
    });
});

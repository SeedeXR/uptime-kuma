import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot } from "../util-test";

test.describe("Admin user management", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
    });

    test("add then delete an admin user", async ({ page }) => {
        await page.goto("./");
        await login(page);
        // Ensure auth has settled before navigating (login() does not await the dashboard)
        await expect(page.getByPlaceholder("Username")).toBeHidden(); // auth settled (viewport-agnostic)

        await page.goto("./settings/users");
        await expect(page.getByTestId("current-password")).toBeVisible();

        // Every mutation requires re-entering the current password
        await page.getByTestId("current-password").fill("admin123");
        await page.getByTestId("new-username").fill("teammate");
        await page.getByTestId("new-password").fill("SuperSecret123!");
        await page.getByTestId("add-user-button").click();

        const newUserCell = page.getByTestId("user-username").filter({ hasText: "teammate" });
        await expect(newUserCell).toBeVisible();

        const row = page.getByTestId("user-row").filter({ hasText: "teammate" });
        await row.getByTestId("delete-user-button").click();

        await expect(page.getByTestId("user-username").filter({ hasText: "teammate" })).toHaveCount(0);
    });

    test("adding a user requires the current password", async ({ page }) => {
        await page.goto("./");
        await login(page);
        await expect(page.getByPlaceholder("Username")).toBeHidden(); // auth settled (viewport-agnostic)

        await page.goto("./settings/users");
        await expect(page.getByTestId("current-password")).toBeVisible();

        // leave current-password empty
        await page.getByTestId("new-username").fill("nopass");
        await page.getByTestId("new-password").fill("SuperSecret123!");
        await page.getByTestId("add-user-button").click();

        await expect(page.getByTestId("user-username").filter({ hasText: "nopass" })).toHaveCount(0);
    });
});

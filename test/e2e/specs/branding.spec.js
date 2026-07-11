import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot } from "../util-test";

test.describe("Seede XR branding", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
    });

    test("document title is Seede XR", async ({ page }) => {
        await page.goto("./");
        await expect(page).toHaveTitle(/Seede XR/);
    });

    test("brand name is shown after login and old brand is gone", async ({ page }) => {
        await page.goto("./");
        await login(page);
        await expect(page.locator("body")).toContainText("Seede XR");
        await expect(page.locator("body")).not.toContainText("Uptime Kuma");
    });
});

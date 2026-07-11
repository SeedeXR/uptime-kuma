import { defineConfig, devices } from "@playwright/test";

const port = 30001;
export const url = `http://localhost:${port}`;

// Default: chromium only (fast CI). CROSS_BROWSER=1 runs the full matrix:
// Chrome, Firefox, Safari (WebKit), Edge, + mobile Android/iOS viewports.
// Each needs its browser binary: `npx playwright install chromium firefox webkit`
// and, for Edge, a locally installed Microsoft Edge (channel: msedge).
const crossBrowser = !!process.env.CROSS_BROWSER;
// PW_CHANNEL=chrome|msedge drives a system-installed browser instead of the bundled
// Chromium (useful when the pinned Chromium is incompatible with the host OS).
const channel = process.env.PW_CHANNEL;
const channelUse = channel ? { channel } : {};
const browserProjects = crossBrowser
    ? [
        { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: [ "run-once setup" ] },
        { name: "firefox", use: { ...devices["Desktop Firefox"] }, dependencies: [ "run-once setup" ] },
        { name: "webkit", use: { ...devices["Desktop Safari"] }, dependencies: [ "run-once setup" ] },
        { name: "msedge", use: { ...devices["Desktop Edge"], channel: "msedge" }, dependencies: [ "run-once setup" ] },
        { name: "mobile-chrome", use: { ...devices["Pixel 5"] }, dependencies: [ "run-once setup" ] },
        { name: "mobile-safari", use: { ...devices["iPhone 12"] }, dependencies: [ "run-once setup" ] },
    ]
    : [
        { name: "specs", use: { ...devices["Desktop Chrome"], ...channelUse }, dependencies: [ "run-once setup" ] },
    ];

export default defineConfig({
    // Look for test files in the "tests" directory, relative to this configuration file.
    testDir: "../test/e2e/specs",
    outputDir: "../private/playwright-test-results",
    fullyParallel: false,
    locale: "en-US",

    // Fail the build on CI if you accidentally left test.only in the source code.
    forbidOnly: !!process.env.CI,

    // Retry on CI only.
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI.
    workers: 1,

    // Reporter to use
    reporter: [
        [
            "html",
            {
                outputFolder: "../private/playwright-report",
                open: "never",
            },
        ],
    ],

    use: {
        // Base URL to use in actions like `await page.goto('/')`.
        baseURL: url,

        // Collect trace when retrying the failed test.
        trace: "on-first-retry",
    },

    // Configure projects for major browsers.
    projects: [
        {
            name: "run-once setup",
            testMatch: /setup-process\.once\.js/,
            use: { ...devices["Desktop Chrome"], ...channelUse },
        },
        ...browserProjects,
    ],

    // Run your local dev server before starting the tests.
    webServer: {
        command: `node extra/remove-playwright-test-data.js && cross-env NODE_ENV=development node server/server.js --port=${port} --data-dir=./data/playwright-test`,
        url,
        reuseExistingServer: false,
        cwd: "../",
    },
});

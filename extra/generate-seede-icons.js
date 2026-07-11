/*
 * Regenerate the raster app icons (PWA / apple-touch / favicon PNG) from the
 * brand SVG at public/icon.svg, using headless Chromium as the rasterizer.
 *
 * Run after changing the logo:  node extra/generate-seede-icons.js
 * Requires: npx playwright install chromium
 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const svg = fs.readFileSync(path.join(publicDir, "icon.svg"), "utf8");

// Square raster icons, black glyph on white (on-brand, plays well on iOS/Android home screens)
const targets = [
    { file: "icon-192x192.png", size: 192 },
    { file: "icon-512x512.png", size: 512 },
    { file: "apple-touch-icon.png", size: 180 },
    { file: "apple-touch-icon-precomposed.png", size: 180 },
    { file: "icon.png", size: 512 },
];

(async () => {
    // Use the bundled Chromium, or a system browser via ICON_CHANNEL=chrome|msedge
    // (needed where the pinned Chromium is too old for the host OS).
    const browser = await chromium.launch(
        process.env.ICON_CHANNEL ? { channel: process.env.ICON_CHANNEL } : {}
    );
    // colorScheme light → the SVG's .glyph renders #121212 (see its internal media query)
    const page = await browser.newPage({ colorScheme: "light" });

    for (const { file, size } of targets) {
        const html = `<!doctype html><html><body style="margin:0">
            <div id="box" style="width:${size}px;height:${size}px;background:#ffffff;
                 display:flex;align-items:center;justify-content:center;">
                <div style="height:70%;display:flex;">${svg.replace(/<svg /, '<svg style="height:100%;width:auto" ')}</div>
            </div></body></html>`;
        await page.setViewportSize({ width: size, height: size });
        await page.setContent(html);
        const box = await page.$("#box");
        await box.screenshot({ path: path.join(publicDir, file) });
        console.log(`wrote public/${file} (${size}x${size})`);
    }

    await browser.close();
})();

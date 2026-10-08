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
    { file: "favicon-48.png", size: 48 }, // wrapped into favicon.ico below, then deleted
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

    // favicon.ico = ICO header + one PNG-encoded 48x48 image (supported by all current browsers)
    const png = fs.readFileSync(path.join(publicDir, "favicon-48.png"));
    const header = Buffer.alloc(22);
    header.writeUInt16LE(1, 2); // type: icon
    header.writeUInt16LE(1, 4); // one image
    header.writeUInt8(48, 6); // width
    header.writeUInt8(48, 7); // height
    header.writeUInt16LE(1, 10); // colour planes
    header.writeUInt16LE(32, 12); // bits per pixel
    header.writeUInt32LE(png.length, 14);
    header.writeUInt32LE(22, 18); // image data offset
    fs.writeFileSync(path.join(publicDir, "favicon.ico"), Buffer.concat([header, png]));
    fs.unlinkSync(path.join(publicDir, "favicon-48.png"));
    console.log("wrote public/favicon.ico (48x48)");
})();

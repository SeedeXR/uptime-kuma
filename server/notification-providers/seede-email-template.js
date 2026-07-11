const { UP, DOWN, PENDING, MAINTENANCE } = require("../../src/util");

// Seede XR brand
const BRAND_BLACK = "#121212";
const BRAND_WHITE = "#ffffff";
const BRAND_GREY = "#c6c6c6";
const RADIUS = "1.5px";
const FONT = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Functional status colours (match the web app)
const STATUS = {
    [UP]: { label: "UP", color: "#198754" },
    [DOWN]: { label: "DOWN", color: "#dc3545" },
    [PENDING]: { label: "PENDING", color: "#f8a306" },
    [MAINTENANCE]: { label: "MAINTENANCE", color: "#1747f5" },
};

/**
 * Escape a string for safe inclusion in HTML.
 * @param {string} s Raw string
 * @returns {string} Escaped string
 */
function esc(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Render a Seede XR-branded HTML email for a monitor notification.
 * @param {object} params Parameters
 * @param {string} params.msg The notification message (plain text)
 * @param {object} params.monitorJSON Monitor JSON (may be null for tests / cert / domain expiry)
 * @param {object} params.heartbeatJSON Heartbeat JSON (may be null)
 * @returns {string} Full HTML document
 */
function renderSeedeEmail({ msg, monitorJSON = null, heartbeatJSON = null }) {
    const status = heartbeatJSON && STATUS[heartbeatJSON.status];
    const accent = status ? status.color : BRAND_BLACK;
    const monitorName = monitorJSON?.name ? esc(monitorJSON.name) : "Seede XR Monitor";
    const url = monitorJSON?.url ? esc(monitorJSON.url) : "";
    const time = heartbeatJSON?.localDateTime || heartbeatJSON?.time || "";

    const statusPill = status
        ? `<span style="display:inline-block;padding:4px 12px;border-radius:${RADIUS};background:${status.color};color:#fff;font-size:12px;font-weight:700;letter-spacing:0.5px;">${status.label}</span>`
        : "";

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#ececec;font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ececec;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND_WHITE};border:1px solid ${BRAND_GREY};border-radius:${RADIUS};overflow:hidden;">
  <tr>
    <td style="background:${BRAND_BLACK};padding:20px 28px;">
      <span style="color:${BRAND_WHITE};font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:0.5px;">Seede&nbsp;XR</span>
    </td>
  </tr>
  <tr>
    <td style="height:4px;background:${accent};font-size:0;line-height:0;">&nbsp;</td>
  </tr>
  <tr>
    <td style="padding:28px;">
      ${statusPill}
      <h1 style="margin:14px 0 6px;color:${BRAND_BLACK};font-family:${FONT};font-size:22px;font-weight:700;">${monitorName}</h1>
      ${url ? `<p style="margin:0 0 16px;color:#666;font-family:${FONT};font-size:13px;">${url}</p>` : ""}
      <p style="margin:0 0 20px;color:${BRAND_BLACK};font-family:${FONT};font-size:15px;line-height:1.5;">${esc(msg)}</p>
      ${time ? `<p style="margin:0;color:#888;font-family:${FONT};font-size:12px;">${esc(time)}</p>` : ""}
    </td>
  </tr>
  <tr>
    <td style="padding:16px 28px;border-top:1px solid #eee;">
      <span style="color:${BRAND_GREY};font-family:${FONT};font-size:12px;">Sent by Seede XR uptime &amp; performance monitoring.</span>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = { renderSeedeEmail };

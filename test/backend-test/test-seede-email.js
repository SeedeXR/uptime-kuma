const { describe, test } = require("node:test");
const assert = require("node:assert");
const { renderSeedeEmail } = require("../../server/notification-providers/seede-email-template");

describe("Seede email template", () => {
    test("escapes HTML in msg and monitor name (no injection)", () => {
        const html = renderSeedeEmail({
            msg: "<script>alert(1)</script>",
            monitorJSON: { name: "<b>evil</b>" },
        });
        assert.ok(!html.includes("<script>alert"));
        assert.ok(html.includes("&lt;script&gt;"));
        assert.ok(!html.includes("<b>evil</b>"));
    });

    test("uses the functional DOWN colour and label", () => {
        const html = renderSeedeEmail({ msg: "is down", heartbeatJSON: { status: 0 } });
        assert.ok(html.includes("#dc3545"));
        assert.ok(html.includes("DOWN"));
    });

    test("uses the functional UP colour", () => {
        const html = renderSeedeEmail({ msg: "is up", heartbeatJSON: { status: 1 } });
        assert.ok(html.includes("#198754"));
    });

    test("carries Seede XR branding (name + brand black)", () => {
        const html = renderSeedeEmail({ msg: "hello" });
        assert.ok(html.includes("Seede"));
        assert.ok(html.includes("#121212"));
    });
});

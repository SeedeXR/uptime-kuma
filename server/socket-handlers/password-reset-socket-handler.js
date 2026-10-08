const crypto = require("crypto");
const dayjs = require("dayjs");
const { R } = require("redbean-node");
const { passwordStrength } = require("check-password-strength");
const { log } = require("../../src/util");
const { Settings } = require("../settings");
const { passwordResetRateLimiter } = require("../rate-limiter");
const Resend = require("../notification-providers/resend");
const { esc } = require("../notification-providers/seede-email-template");
const TranslatableError = require("../translatable-error");
const User = require("../model/user");
const { UptimeKumaServer } = require("../uptime-kuma-server");

const TOKEN_TTL_MINUTES = 30;
const RESEND_COOLDOWN_MINUTES = 5; // at most one email per account per 5 minutes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * sha256 hex digest (tokens are 256-bit random, so a fast hash is enough)
 * @param {string} value Value to hash
 * @returns {string} Hex digest
 */
const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

/**
 * Email the reset link (Resend, same env config and proxy as the Resend notification provider)
 * @param {string} to Recipient (the account's username, which is an email address)
 * @param {string} link Reset link
 * @returns {Promise<void>}
 */
async function sendResetEmail(to, link) {
    const html = `<div style="font-family:'Space Grotesk',-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#121212">
<h1 style="font-size:20px;margin:0 0 12px">Reset your Seede XR password</h1>
<p style="color:#6b6b6b;line-height:1.5">Someone asked to reset the password for ${esc(to)}. The link works once and expires in ${TOKEN_TTL_MINUTES} minutes.</p>
<p style="margin:28px 0"><a href="${esc(link)}" style="background:#121212;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none;display:inline-block">Choose a new password</a></p>
<p style="color:#6b6b6b;font-size:13px">If you didn't ask for this, ignore this email — your password stays the same.</p>
</div>`;
    await new Resend().deliver({
        to,
        subject: "Reset your Seede XR password",
        html,
        text: `Reset your Seede XR password: ${link}\nThe link works once and expires in ${TOKEN_TTL_MINUTES} minutes. If you didn't ask for this, ignore this email.`,
    });
}

/**
 * Pre-login handlers for "forgot password" (email link) and setting a new password with it.
 * Responses never reveal whether an account exists; links are built only from the
 * primaryBaseURL setting, never the request's Host header (prevents reset-link poisoning).
 * @param {Socket} socket Socket.io instance
 * @returns {void}
 */
module.exports.passwordResetSocketHandler = (socket) => {
    socket.on("requestPasswordReset", async (email, callback) => {
        if (typeof callback !== "function" || !(await passwordResetRateLimiter.pass(callback))) {
            return;
        }
        // Same answer either way, sent before any email work so timing doesn't leak existence
        callback({ ok: true, msg: "passwordResetRequested", msgi18n: true });

        try {
            const username = String(email || "").trim();
            // Length cap before the regex (no slow backtracking on huge unauthenticated input)
            const user = username.length <= 254 && EMAIL_RE.test(username) && (await R.findOne("user", " username = ? AND active = 1 ", [username]));
            if (!user) {
                return;
            }
            // A link issued in the last few minutes is still fresh: don't re-send (stops inbox flooding)
            if (user.reset_token_expires && dayjs.utc(user.reset_token_expires).diff(dayjs.utc(), "minute", true) > TOKEN_TTL_MINUTES - RESEND_COOLDOWN_MINUTES) {
                return;
            }
            const baseURL = ((await Settings.get("primaryBaseURL")) || "").replace(/\/+$/, "");
            if (!/^https?:\/\/[^/]+/.test(baseURL)) {
                log.error("password-reset", "Primary Base URL is not set (Settings → General); cannot build a reset link");
                return;
            }
            const token = crypto.randomBytes(32).toString("hex");
            await R.exec("UPDATE `user` SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?", [
                sha256(token),
                R.isoDateTimeMillis(dayjs.utc().add(TOKEN_TTL_MINUTES, "minute")),
                user.id,
            ]);
            await sendResetEmail(user.username, `${baseURL}/reset-password?token=${token}`);
            log.info("password-reset", `Reset link sent for user id ${user.id}`);
        } catch (e) {
            log.error("password-reset", `Could not send reset email: ${e.message}`);
        }
    });

    socket.on("resetPasswordWithToken", async (data, callback) => {
        if (typeof callback !== "function" || !(await passwordResetRateLimiter.pass(callback))) {
            return;
        }
        try {
            const { token, newPassword } = data || {};
            if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
                throw new TranslatableError("passwordResetInvalid");
            }
            const user = await R.findOne("user", " reset_token_hash = ? ", [sha256(token)]);
            if (!user || !user.reset_token_expires || dayjs.utc(user.reset_token_expires).isBefore(dayjs.utc())) {
                throw new TranslatableError("passwordResetInvalid");
            }
            if (passwordStrength(newPassword).value === "Too weak") {
                throw new TranslatableError("passwordTooWeak");
            }
            // Consume the token atomically first: of two concurrent uses only one clears it
            const consumed = await R.knex("user").where({ id: user.id, reset_token_hash: user.reset_token_hash }).update({ reset_token_hash: null, reset_token_expires: null });
            if (consumed !== 1) {
                throw new TranslatableError("passwordResetInvalid");
            }
            await User.resetPassword(user.id, newPassword);
            // Existing sessions embed the old password hash; drop them now
            UptimeKumaServer.getInstance().disconnectAllSocketClients(user.id);
            log.info("password-reset", `Password reset via email link for user id ${user.id}`);
            callback({ ok: true, msg: "passwordResetDone", msgi18n: true });
        } catch (e) {
            callback({ ok: false, msg: e.message, msgi18n: !!e.msgi18n });
        }
    });
};

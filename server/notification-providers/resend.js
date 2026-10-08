const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { renderSeedeEmail } = require("./seede-email-template");

/**
 * Build Resend's "from": EMAIL_FROM may be a bare address or already "Name <address>"
 * (wrapping the latter again gives "Name <Name <a@b>>", which Resend rejects with 422)
 * @param {string} from Configured sender
 * @param {string} name Display name for a bare address
 * @returns {string} Valid from field
 */
function formatFrom(from, name) {
    return /<[^<>\s]+@[^<>\s]+>$/.test(from) ? from : `${name} <${from}>`;
}

class Resend extends NotificationProvider {
    name = "Resend";

    /**
     * @inheritdoc
     */
    async send(notification, msg, monitorJSON = null, heartbeatJSON = null) {
        try {
            await this.deliver(
                {
                    to: notification.resendToEmail,
                    subject: notification.resendSubject || "Notification from Seede XR",
                    // Branded HTML with a plain-text fallback for clients that don't render HTML
                    html: renderSeedeEmail({ msg, monitorJSON, heartbeatJSON }),
                    text: msg,
                },
                notification
            );
            return "Sent Successfully.";
        } catch (error) {
            this.throwGeneralAxiosError(error);
        }
    }

    /**
     * Send one email through Resend. API key and from-address come from the environment (.env),
     * falling back to per-notification form fields for backward compatibility.
     * @param {{to: string, subject: string, html: string, text: string}} email Message
     * @param {object} notification Notification settings (optional fallbacks)
     * @returns {Promise<void>}
     */
    async deliver(email, notification = {}) {
        const apiKey = process.env.RESEND_API_KEY || notification.resendApiKey;
        const fromEmail = (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || notification.resendFromEmail || "").trim();
        const fromName = process.env.RESEND_FROM_NAME || notification.resendFromName?.trim() || "Seede XR";

        if (!apiKey || !fromEmail) {
            throw new Error("Resend is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL in the environment.");
        }

        const config = this.getAxiosConfigWithProxy({
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            timeout: 15000,
        });
        const result = await axios.post("https://api.resend.com/emails", { from: formatFrom(fromEmail, fromName), ...email }, config);
        if (result.status !== 200) {
            throw new Error(`Unexpected status code: ${result.status}`);
        }
    }
}

module.exports = Resend;
module.exports.formatFrom = formatFrom;

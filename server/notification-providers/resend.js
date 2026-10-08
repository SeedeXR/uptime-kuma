const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { renderSeedeEmail } = require("./seede-email-template");
const { version } = require("../../package.json");

/**
 * Sender for Resend. EMAIL_FROM is used exactly as written: "noreply@domain", or
 * "Custom Name <noreply@domain>" to show a sender name. Only notifications created before the
 * env setup (per-notification From fields) get their name added here.
 * @param {object} notification Notification settings (legacy fallback)
 * @returns {string} Resend "from" value, or "" when nothing is configured
 */
function senderFrom(notification = {}) {
    const configured = (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "").trim();
    if (configured) {
        return configured;
    }
    const email = notification.resendFromEmail?.trim();
    const name = notification.resendFromName?.trim();
    return email ? (name ? `${name} <${email}>` : email) : "";
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
        const from = senderFrom(notification);

        if (!apiKey || !from) {
            throw new Error("Resend is not configured: set RESEND_API_KEY and EMAIL_FROM in the environment.");
        }

        const config = this.getAxiosConfigWithProxy({
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                // Resend docs: every request must send a User-Agent or it is rejected with 403
                "User-Agent": `Seede-XR-Monitor/${version}`,
            },
            timeout: 15000,
        });
        const result = await axios.post("https://api.resend.com/emails", { from, ...email }, config);
        if (result.status !== 200) {
            throw new Error(`Unexpected status code: ${result.status}`);
        }
    }
}

module.exports = Resend;
module.exports.senderFrom = senderFrom;

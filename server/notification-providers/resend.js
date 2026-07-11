const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { renderSeedeEmail } = require("./seede-email-template");

class Resend extends NotificationProvider {
    name = "Resend";

    /**
     * @inheritdoc
     */
    async send(notification, msg, monitorJSON = null, heartbeatJSON = null) {
        const okMsg = "Sent Successfully.";

        try {
            // API key and from-address are configured in the environment (.env);
            // fall back to the per-notification form fields for backward compatibility.
            const apiKey = process.env.RESEND_API_KEY || notification.resendApiKey;
            const fromEmail = (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || notification.resendFromEmail || "").trim();
            const fromName = process.env.RESEND_FROM_NAME || notification.resendFromName?.trim() || "Seede XR";

            if (!apiKey || !fromEmail) {
                throw new Error("Resend is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL in the environment.");
            }

            let config = {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
            };
            config = this.getAxiosConfigWithProxy(config);

            let data = {
                from: `${fromName} <${fromEmail}>`,
                to: notification.resendToEmail,
                subject: notification.resendSubject || "Notification from Seede XR",
                // Branded HTML with a plain-text fallback for clients that don't render HTML
                html: renderSeedeEmail({ msg, monitorJSON, heartbeatJSON }),
                text: msg,
            };

            let result = await axios.post("https://api.resend.com/emails", data, config);
            if (result.status === 200) {
                return okMsg;
            } else {
                throw new Error(`Unexpected status code: ${result.status}`);
            }
        } catch (error) {
            this.throwGeneralAxiosError(error);
        }
    }
}

module.exports = Resend;

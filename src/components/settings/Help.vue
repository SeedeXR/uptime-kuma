<template>
    <div>
        <h4 class="mb-3">{{ $t("Help") }}</h4>

        <!-- Getting started / onboarding -->
        <div class="help-card shadow-box mb-4">
            <div class="d-flex justify-content-between align-items-center flex-wrap">
                <div>
                    <h5 class="mb-1">Getting started</h5>
                    <p class="text-secondary mb-0">Take the guided tour again any time.</p>
                </div>
                <button class="btn btn-primary mt-2 mt-sm-0" @click="restartOnboarding">
                    <font-awesome-icon icon="play" class="me-1" /> Restart onboarding
                </button>
            </div>
        </div>

        <!-- Docs sections -->
        <div class="help-card shadow-box mb-3">
            <h5><font-awesome-icon icon="plus" class="me-2" />Monitors</h5>
            <p class="text-secondary mb-0">
                Create a monitor from <strong>Add New Monitor</strong>. Choose a type (HTTP, TCP, Ping, DNS and more),
                set the URL/host and check interval, then save. All admins share the same monitors.
            </p>
        </div>

        <div class="help-card shadow-box mb-3">
            <h5><font-awesome-icon icon="bullhorn" class="me-2" />Notifications</h5>
            <p class="text-secondary mb-0">
                Configure channels under <strong>Settings → Notifications</strong>. For email, use the
                <strong>Resend</strong> channel (API key and sender address are set via environment variables).
                Attach one or more notifications to each monitor — no extra account is needed to add a recipient.
            </p>
        </div>

        <div class="help-card shadow-box mb-3">
            <h5><font-awesome-icon icon="stream" class="me-2" />Status pages</h5>
            <p class="text-secondary mb-0">
                Publish a public status page from <strong>Status Pages</strong>. Add the monitors you want to show,
                customise the branding, and share the link.
            </p>
        </div>

        <div class="help-card shadow-box mb-3">
            <h5><font-awesome-icon icon="list" class="me-2" />Team &amp; admins</h5>
            <p class="text-secondary mb-0">
                Add teammates as admins under <strong>Settings → Users</strong>. Every admin shares the same
                monitors, notifications and status pages.
            </p>
        </div>

        <div class="help-card shadow-box">
            <h5><font-awesome-icon icon="question-circle" class="me-2" />More documentation</h5>
            <p class="text-secondary mb-0">
                Seede XR is built on the open-source Uptime Kuma engine. For advanced configuration see the
                <a href="https://github.com/louislam/uptime-kuma/wiki" target="_blank" rel="noopener">engine documentation</a>.
            </p>
        </div>
    </div>
</template>

<script>
export default {
    methods: {
        /**
         * Re-trigger the onboarding workflow
         * @returns {void}
         */
        restartOnboarding() {
            localStorage.removeItem("seede-onboarding-completed");
            window.dispatchEvent(new CustomEvent("seede:onboarding"));
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../../assets/vars.scss";

.help-card {
    padding: 20px;

    h5 {
        font-weight: 700;
    }
}
</style>

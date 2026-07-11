<template>
    <transition name="fade">
        <div v-if="visible" class="onboarding-backdrop" @click.self="skip">
            <div class="onboarding-card shadow-box">
                <!-- Progress -->
                <div class="onboarding-progress">
                    <span
                        v-for="(s, i) in steps"
                        :key="i"
                        class="dot"
                        :class="{ active: i === step, done: i < step }"
                    />
                </div>

                <div class="onboarding-body">
                    <div class="onboarding-icon">
                        <font-awesome-icon :icon="steps[step].icon" />
                    </div>
                    <h2 class="onboarding-title">{{ $t(steps[step].title) }}</h2>
                    <p class="onboarding-desc">{{ $t(steps[step].desc) }}</p>

                    <button
                        v-if="steps[step].route"
                        class="btn btn-primary onboarding-action"
                        @click="goTo(steps[step].route)"
                    >
                        {{ $t(steps[step].action) }}
                    </button>
                </div>

                <!-- Footer nav -->
                <div class="onboarding-footer">
                    <button class="btn btn-link onboarding-skip" @click="skip">{{ $t("Skip") }}</button>
                    <div>
                        <button v-if="step > 0" class="btn btn-normal me-2" @click="back">{{ $t("Back") }}</button>
                        <button v-if="step < steps.length - 1" class="btn btn-primary" @click="next">{{ $t("Next") }}</button>
                        <button v-else class="btn btn-primary" @click="finish">{{ $t("Finish") }}</button>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
const STORAGE_KEY = "seede-onboarding-completed";

export default {
    data() {
        return {
            visible: false,
            step: 0,
            steps: [
                { icon: "heartbeat", title: "onboardingWelcomeTitle", desc: "onboardingWelcomeDesc" },
                { icon: "plus", title: "onboardingMonitorTitle", desc: "onboardingMonitorDesc", action: "Add New Monitor", route: "/add" },
                { icon: "bullhorn", title: "onboardingNotifyTitle", desc: "onboardingNotifyDesc", action: "Setup Notification", route: "/settings/notifications" },
                { icon: "list", title: "onboardingTeamTitle", desc: "onboardingTeamDesc", action: "Users", route: "/settings/users" },
                { icon: "check-circle", title: "onboardingDoneTitle", desc: "onboardingDoneDesc" },
            ],
        };
    },

    watch: {
        // Commence onboarding when the user logs in
        "$root.loggedIn"(loggedIn) {
            if (loggedIn) {
                this.maybeAutoStart();
            }
        },
    },

    mounted() {
        this.onTrigger = () => this.start();
        window.addEventListener("seede:onboarding", this.onTrigger);
        // Commence when the user reaches the dashboard (already logged in on mount, e.g. just after login)
        if (this.$root.loggedIn) {
            this.maybeAutoStart();
        }
    },

    beforeUnmount() {
        window.removeEventListener("seede:onboarding", this.onTrigger);
    },

    methods: {
        /**
         * Auto-start onboarding once per browser session on login (never under automation)
         * @returns {void}
         */
        maybeAutoStart() {
            if (navigator.webdriver) {
                return;
            }
            if (sessionStorage.getItem(STORAGE_KEY)) {
                return;
            }
            sessionStorage.setItem(STORAGE_KEY, "1");
            setTimeout(() => this.start(), 700);
        },
        /**
         * Start (or restart) the onboarding
         * @returns {void}
         */
        start() {
            this.step = 0;
            this.visible = true;
        },
        /**
         * Go to the next step
         * @returns {void}
         */
        next() {
            if (this.step < this.steps.length - 1) {
                this.step++;
            }
        },
        /**
         * Go to the previous step
         * @returns {void}
         */
        back() {
            if (this.step > 0) {
                this.step--;
            }
        },
        /**
         * Skip onboarding
         * @returns {void}
         */
        skip() {
            this.complete();
        },
        /**
         * Finish onboarding
         * @returns {void}
         */
        finish() {
            this.complete();
        },
        /**
         * Navigate to a step's action and close
         * @param {string} route Route path to navigate to
         * @returns {void}
         */
        goTo(route) {
            this.complete();
            this.$router.push(route);
        },
        /**
         * Mark onboarding complete and close
         * @returns {void}
         */
        complete() {
            // Session guard is already set in maybeAutoStart; just close.
            sessionStorage.setItem(STORAGE_KEY, "1");
            this.visible = false;
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../assets/vars.scss";

.onboarding-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1080;
    background: rgba(18, 18, 18, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.onboarding-card {
    background: white;
    width: 100%;
    max-width: 460px;
    padding: 32px;
    border-radius: $border-radius;

    .dark & {
        background: $dark-bg;
    }
}

.onboarding-progress {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-bottom: 28px;

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: $secondary-text;

        &.active {
            background: $primary;
            width: 24px;
            border-radius: $border-radius;
        }

        &.done {
            background: $primary;
        }

        .dark &.active,
        .dark &.done {
            background: white;
        }
    }
}

.onboarding-body {
    text-align: center;
}

.onboarding-icon {
    font-size: 40px;
    color: $primary;
    margin-bottom: 16px;

    .dark & {
        color: white;
    }
}

.onboarding-title {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 10px;
}

.onboarding-desc {
    color: $secondary-text;
    font-size: 15px;
    line-height: 1.5;
    margin-bottom: 24px;
}

.onboarding-action {
    margin-bottom: 8px;
}

.onboarding-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 28px;
}

.onboarding-skip {
    color: $secondary-text;
    text-decoration: none;
    padding-left: 0;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>

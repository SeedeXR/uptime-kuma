<template>
    <transition name="cmdk-fade">
        <div v-if="visible" class="cmdk-backdrop" @click.self="close" @keydown.esc="close">
            <div class="cmdk-panel">
                <div class="cmdk-search">
                    <font-awesome-icon icon="search" class="cmdk-search-icon" />
                    <input
                        ref="input"
                        v-model="query"
                        type="text"
                        class="cmdk-input"
                        :placeholder="$t('Search modules & actions…')"
                        @keydown.down.prevent="move(1)"
                        @keydown.up.prevent="move(-1)"
                        @keydown.enter.prevent="run(filtered[active])"
                        @keydown.esc="close"
                    />
                    <kbd class="cmdk-esc">esc</kbd>
                </div>
                <ul class="cmdk-list">
                    <li
                        v-for="(cmd, i) in filtered"
                        :key="cmd.label"
                        class="cmdk-item"
                        :class="{ active: i === active }"
                        @click="run(cmd)"
                        @mouseenter="active = i"
                    >
                        <font-awesome-icon :icon="cmd.icon" class="cmdk-item-icon" />
                        <span>{{ cmd.label }}</span>
                    </li>
                    <li v-if="filtered.length === 0" class="cmdk-empty">{{ $t("No results") }}</li>
                </ul>
            </div>
        </div>
    </transition>
</template>

<script>
export default {
    data() {
        return {
            visible: false,
            query: "",
            active: 0,
        };
    },

    computed: {
        /**
         * All available commands
         * @returns {Array} commands
         */
        commands() {
            return [
                { label: this.$t("Dashboard"), icon: "tachometer-alt", route: "/dashboard" },
                { label: this.$t("Monitors"), icon: "list", route: "/list" },
                { label: this.$t("Add New Monitor"), icon: "plus", route: "/add" },
                { label: this.$t("Status Pages"), icon: "stream", route: "/manage-status-page" },
                { label: this.$t("Maintenance"), icon: "wrench", route: "/maintenance" },
                { label: this.$t("Settings"), icon: "cog", route: "/settings/general" },
                { label: this.$t("Notifications"), icon: "bullhorn", route: "/settings/notifications" },
                { label: this.$t("Users"), icon: "list", route: "/settings/users" },
                { label: this.$t("Appearance"), icon: "eye", route: "/settings/appearance" },
                { label: this.$t("Help"), icon: "question-circle", route: "/settings/help" },
                { label: this.$t("Restart onboarding"), icon: "play", event: "seede:onboarding" },
                { label: this.$t("Logout"), icon: "sign-out-alt", fn: () => this.$root.logout() },
            ];
        },
        /**
         * Commands filtered by the query
         * @returns {Array} filtered
         */
        filtered() {
            const q = this.query.trim().toLowerCase();
            if (!q) {
                return this.commands;
            }
            return this.commands.filter((c) => c.label.toLowerCase().includes(q));
        },
    },

    watch: {
        query() {
            this.active = 0;
        },
    },

    mounted() {
        this.onKeydown = (e) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
                e.preventDefault();
                this.toggle();
            }
        };
        this.onOpen = () => this.open();
        window.addEventListener("keydown", this.onKeydown);
        window.addEventListener("seede:open-command-palette", this.onOpen);
    },

    beforeUnmount() {
        window.removeEventListener("keydown", this.onKeydown);
        window.removeEventListener("seede:open-command-palette", this.onOpen);
    },

    methods: {
        /**
         * Open the palette
         * @returns {void}
         */
        open() {
            if (!this.$root.loggedIn) {
                return;
            }
            this.query = "";
            this.active = 0;
            this.visible = true;
            this.$nextTick(() => this.$refs.input?.focus());
        },
        /**
         * Close the palette
         * @returns {void}
         */
        close() {
            this.visible = false;
        },
        /**
         * Toggle the palette
         * @returns {void}
         */
        toggle() {
            this.visible ? this.close() : this.open();
        },
        /**
         * Move the active selection
         * @param {number} delta Step (+1 / -1)
         * @returns {void}
         */
        move(delta) {
            const n = this.filtered.length;
            if (n === 0) {
                return;
            }
            this.active = (this.active + delta + n) % n;
        },
        /**
         * Run a command
         * @param {object} cmd The command to run
         * @returns {void}
         */
        run(cmd) {
            if (!cmd) {
                return;
            }
            this.close();
            if (cmd.route) {
                this.$router.push(cmd.route);
            } else if (cmd.event) {
                window.dispatchEvent(new CustomEvent(cmd.event));
            } else if (cmd.fn) {
                cmd.fn();
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../assets/vars.scss";

.cmdk-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1090;
    background: rgba(18, 18, 18, 0.45);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
}

.cmdk-panel {
    width: 100%;
    max-width: 560px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(198, 198, 198, 0.6);
    border-radius: $border-radius;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
    overflow: hidden;

    .dark & {
        background: rgba(26, 26, 26, 0.85);
        border-color: rgba(255, 255, 255, 0.12);
    }
}

.cmdk-search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 18px;
    border-bottom: 1px solid rgba(198, 198, 198, 0.4);

    .dark & {
        border-color: rgba(255, 255, 255, 0.1);
    }
}

.cmdk-search-icon {
    color: $secondary-text;
}

.cmdk-input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 16px;
    color: $dark-bg;

    .dark & {
        color: white;
    }
}

.cmdk-esc {
    font-size: 11px;
    color: $secondary-text;
    border: 1px solid rgba(198, 198, 198, 0.6);
    border-radius: $border-radius;
    padding: 1px 6px;
}

.cmdk-list {
    list-style: none;
    margin: 0;
    padding: 8px;
    max-height: 50vh;
    overflow-y: auto;
}

.cmdk-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: $border-radius;
    cursor: pointer;
    color: $dark-bg;

    .dark & {
        color: $dark-font-color;
    }

    &.active {
        background: #121212;
        color: white;

        .dark & {
            background: white;
            color: #121212;
        }
    }
}

.cmdk-item-icon {
    width: 18px;
    color: inherit;
}

.cmdk-empty {
    padding: 16px;
    text-align: center;
    color: $secondary-text;
}

.cmdk-fade-enter-active,
.cmdk-fade-leave-active {
    transition: opacity 0.15s ease;
}

.cmdk-fade-enter-from,
.cmdk-fade-leave-to {
    opacity: 0;
}
</style>

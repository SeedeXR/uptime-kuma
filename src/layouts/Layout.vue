<template>
    <div :class="classes">
        <div v-if="!$root.socket.connected && !$root.socket.firstConnect" class="lost-connection">
            <div class="container-fluid">
                {{ $root.connectionErrorMsg }}
                <div v-if="$root.showReverseProxyGuide">
                    {{ $t("Using a Reverse Proxy?") }}
                    <a href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy" target="_blank">
                        {{ $t("Check how to config it for WebSocket") }}
                    </a>
                </div>
            </div>
        </div>

        <!-- Desktop sidebar (logged in) -->
        <aside v-if="$root.loggedIn && !$root.isMobile" class="sidebar">
            <router-link to="/dashboard" class="sidebar-brand">
                <img src="/icon.svg" alt="Seede XR" class="brand-icon" />
            </router-link>

            <button class="sidebar-search" :title="$t('Search')" @click="openCommandPalette">
                <font-awesome-icon icon="search" />
                <span v-if="!sidebarCollapsed" class="ss-label">{{ $t("Search") }}</span>
                <kbd v-if="!sidebarCollapsed">{{ cmdKeyLabel }}K</kbd>
            </button>

            <nav class="sidebar-nav">
                <router-link to="/dashboard" class="side-link">
                    <font-awesome-icon icon="tachometer-alt" /><span>{{ $t("Dashboard") }}</span>
                </router-link>
                <router-link to="/list" class="side-link">
                    <font-awesome-icon icon="list" /><span>{{ $t("Monitors") }}</span>
                </router-link>
                <router-link to="/add" class="side-link">
                    <font-awesome-icon icon="plus" /><span>{{ $t("Add New Monitor") }}</span>
                </router-link>
                <router-link to="/manage-status-page" class="side-link">
                    <font-awesome-icon icon="stream" /><span>{{ $t("Status Pages") }}</span>
                </router-link>
                <router-link to="/maintenance" class="side-link" :class="{ active: $route.path.includes('maintenance') }">
                    <font-awesome-icon icon="wrench" /><span>{{ $t("Maintenance") }}</span>
                </router-link>
                <router-link to="/settings/general" class="side-link" :class="{ active: $route.path.includes('settings') }">
                    <font-awesome-icon icon="cog" /><span>{{ $t("Settings") }}</span>
                </router-link>
                <router-link to="/settings/help" class="side-link">
                    <font-awesome-icon icon="question-circle" /><span>{{ $t("Help") }}</span>
                </router-link>
            </nav>

            <div class="sidebar-bottom">
                <a
                    v-if="hasNewVersion"
                    target="_blank"
                    href="https://github.com/louislam/uptime-kuma/releases"
                    class="side-link update-link"
                >
                    <font-awesome-icon icon="arrow-alt-circle-up" /><span>{{ $t("New Update") }}</span>
                </a>

                <div class="dropdown sidebar-user">
                    <div class="side-link user-trigger" data-bs-toggle="dropdown">
                        <div class="profile-pic">{{ $root.usernameFirstChar }}</div>
                        <span v-if="!sidebarCollapsed" class="username">{{ $root.username || $t("Guest") }}</span>
                    </div>
                    <ul class="dropdown-menu">
                        <li>
                            <i18n-t v-if="$root.username != null" tag="span" keypath="signedInDisp" class="dropdown-item-text">
                                <strong>{{ $root.username }}</strong>
                            </i18n-t>
                            <span v-if="$root.username == null" class="dropdown-item-text">
                                {{ $t("signedInDispDisabled") }}
                            </span>
                        </li>
                        <li><hr class="dropdown-divider" /></li>
                        <li>
                            <router-link to="/maintenance" class="dropdown-item">
                                <font-awesome-icon icon="wrench" /> {{ $t("Maintenance") }}
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/settings/general" class="dropdown-item">
                                <font-awesome-icon icon="cog" /> {{ $t("Settings") }}
                            </router-link>
                        </li>
                        <li v-if="$root.loggedIn && $root.socket.token !== 'autoLogin'">
                            <button class="dropdown-item" @click="$root.logout">
                                <font-awesome-icon icon="sign-out-alt" /> {{ $t("Logout") }}
                            </button>
                        </li>
                    </ul>
                </div>

                <button class="side-link toggle-link" :title="$t('Toggle sidebar')" @click="toggleSidebar">
                    <font-awesome-icon :icon="sidebarCollapsed ? 'chevron-right' : 'chevron-left'" />
                    <span v-if="!sidebarCollapsed">{{ $t("Collapse") }}</span>
                </button>
            </div>
        </aside>

        <!-- Login header (desktop, not logged in) -->
        <header v-if="!$root.isMobile && !$root.loggedIn" class="d-flex justify-content-center py-3 mb-3 border-bottom">
            <span class="d-flex align-items-center text-dark text-decoration-none">
                <object class="bi me-2" width="40" height="40" data="/icon.svg" />
                <span class="fs-4 title">Seede XR</span>
            </span>
        </header>

        <!-- Mobile header -->
        <header v-if="$root.isMobile" class="d-flex flex-wrap justify-content-center pt-2 pb-2 mb-3">
            <router-link to="/dashboard" class="d-flex align-items-center text-dark text-decoration-none">
                <object class="bi" width="40" height="40" data="/icon.svg" />
                <span class="fs-4 title ms-2">Seede XR</span>
            </router-link>
        </header>

        <main>
            <router-view v-if="$root.loggedIn" />
            <Login v-if="!$root.loggedIn && $root.allowLoginDialog" />
        </main>

        <!-- Mobile Only -->
        <div v-if="$root.isMobile" style="width: 100%; height: calc(60px + env(safe-area-inset-bottom))" />
        <nav v-if="$root.isMobile && $root.loggedIn" class="bottom-nav">
            <router-link to="/dashboard" class="nav-link">
                <div><font-awesome-icon icon="tachometer-alt" /></div>
                {{ $t("Home") }}
            </router-link>

            <router-link to="/list" class="nav-link">
                <div><font-awesome-icon icon="list" /></div>
                {{ $t("List") }}
            </router-link>

            <router-link to="/add" class="nav-link">
                <div><font-awesome-icon icon="plus" /></div>
                {{ $t("Add") }}
            </router-link>

            <router-link to="/settings" class="nav-link">
                <div><font-awesome-icon icon="cog" /></div>
                {{ $t("Settings") }}
            </router-link>
        </nav>

        <button
            v-if="numActiveToasts != 0"
            type="button"
            class="btn btn-normal clear-all-toast-btn"
            @click="clearToasts"
        >
            <font-awesome-icon icon="times" />
        </button>

        <Onboarding />
        <CommandPalette />
    </div>
</template>

<script>
import Login from "../components/Login.vue";
import Onboarding from "../components/Onboarding.vue";
import CommandPalette from "../components/CommandPalette.vue";
import compareVersions from "compare-versions";
import { useToast } from "vue-toastification";
const toast = useToast();

const SIDEBAR_KEY = "seede-sidebar-collapsed";

export default {
    components: {
        Login,
        Onboarding,
        CommandPalette,
    },

    data() {
        return {
            toastContainer: null,
            numActiveToasts: 0,
            toastContainerObserver: null,
            sidebarCollapsed: localStorage.getItem(SIDEBAR_KEY) === "1",
        };
    },

    computed: {
        // Theme, mobile, and sidebar state
        classes() {
            const classes = {};
            classes[this.$root.theme] = true;
            classes["mobile"] = this.$root.isMobile;
            classes["has-sidebar"] = this.$root.loggedIn && !this.$root.isMobile;
            classes["sidebar-collapsed"] = this.sidebarCollapsed;
            return classes;
        },

        // "⌘" on macOS/iOS, "Ctrl+" elsewhere
        cmdKeyLabel() {
            const p = navigator.platform || navigator.userAgent || "";
            return /Mac|iPhone|iPad|iPod/.test(p) ? "⌘" : "Ctrl+";
        },

        hasNewVersion() {
            if (this.$root.info.latestVersion && this.$root.info.version) {
                return compareVersions(this.$root.info.latestVersion, this.$root.info.version) >= 1;
            } else {
                return false;
            }
        },
    },

    watch: {},

    mounted() {
        this.toastContainer = document.querySelector(".bottom-right.toast-container");

        // Watch the number of active toasts
        this.toastContainerObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    this.numActiveToasts = mutation.target.children.length;
                }
            }
        });

        if (this.toastContainer != null) {
            this.toastContainerObserver.observe(this.toastContainer, { childList: true });
        }
    },

    beforeUnmount() {
        this.toastContainerObserver.disconnect();
    },

    methods: {
        /**
         * Clear all toast notifications.
         * @returns {void}
         */
        clearToasts() {
            toast.clear();
        },

        /**
         * Collapse / expand the sidebar (persisted)
         * @returns {void}
         */
        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            localStorage.setItem(SIDEBAR_KEY, this.sidebarCollapsed ? "1" : "0");
        },

        /**
         * Open the command palette
         * @returns {void}
         */
        openCommandPalette() {
            window.dispatchEvent(new CustomEvent("seede:open-command-palette"));
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../assets/vars.scss";

// ---- Sidebar (desktop) ----
$sidebar-width: 248px;
$sidebar-width-collapsed: 74px;

.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: $sidebar-width;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    padding: 18px 12px;
    // Always dark (the admin brand logo is light); pairs with light or dark content.
    background: rgba(18, 18, 18, 0.82);
    backdrop-filter: blur(18px) saturate(160%);
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    transition: width 0.2s ease;
    overflow-x: hidden;
}

.sidebar-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 10px 20px;
    min-height: 52px;
    text-decoration: none;

    .brand-icon {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        // Force the glyph to solid white on the dark sidebar, independent of OS theme
        filter: brightness(0) invert(1);
    }
}

.sidebar-search {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    margin-bottom: 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: $border-radius;
    background: rgba(255, 255, 255, 0.05);
    color: $secondary-text;
    font-size: 13px;
    cursor: pointer;

    .ss-label {
        flex: 1;
        text-align: left;
    }

    kbd {
        font-size: 11px;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: $border-radius;
        padding: 0 5px;
        color: $secondary-text;
    }

    &:hover {
        border-color: rgba(255, 255, 255, 0.5);
    }
}

.sidebar-nav {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
}

.sidebar-bottom {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

// Shared sidebar item — light text on the dark sidebar; contrast-correct hover.
.side-link {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 3px;
    border: none;
    background: transparent;
    border-radius: $border-radius;
    color: $secondary-text;
    text-decoration: none;
    font-size: 14px;
    white-space: nowrap;
    cursor: pointer;
    text-align: left;

    svg {
        width: 18px;
        flex-shrink: 0;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.09);
        color: #fff;
    }

    &.router-link-exact-active,
    &.active {
        background: #fff;
        color: #121212;
    }
}

.sidebar-user {
    .user-trigger {
        user-select: none;
    }

    .profile-pic {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #121212;
        background-color: #fff;
        width: 26px;
        height: 26px;
        border-radius: $border-radius;
        font-weight: bold;
        font-size: 11px;
        flex-shrink: 0;
    }

    .username {
        color: $secondary-text;
    }

    .dropdown-menu {
        border-radius: $border-radius;
        background-color: $dark-bg;
        color: $dark-font-color;
        border-color: $dark-border-color;

        .dropdown-item {
            color: $dark-font-color;

            &:hover {
                background-color: $dark-bg2;
                color: #fff;
            }
        }
    }
}

// Collapsed state — icons only
.sidebar-collapsed {
    .sidebar {
        width: $sidebar-width-collapsed;
        padding-left: 8px;
        padding-right: 8px;
    }

    .side-link span,
    .sidebar-search .ss-label,
    .sidebar-search kbd,
    .sidebar-user .username {
        display: none;
    }

    .side-link,
    .sidebar-search,
    .sidebar-brand {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
    }
}

// Content area shifts to make room for the fixed sidebar
.has-sidebar {
    main {
        margin-left: $sidebar-width;
        padding: 22px 30px;
        transition: margin-left 0.2s ease;
    }

    &.sidebar-collapsed main {
        margin-left: $sidebar-width-collapsed;
    }
}

// ---- Existing chrome ----
.nav-link {
    &:hover {
        background-color: $primary;
        color: #fff;

        .dark & {
            // contrast-safe: light wash + light text (was black-on-black)
            background-color: rgba(255, 255, 255, 0.12);
            color: #fff;
        }

        &.active {
            background-color: $highlight;
        }
    }

    &.status-page {
        background-color: rgba(255, 255, 255, 0.1);
    }
}

.bottom-nav {
    z-index: 1000;
    position: fixed;
    bottom: 0;
    height: calc(60px + env(safe-area-inset-bottom));
    width: 100%;
    left: 0;
    background-color: #fff;
    box-shadow:
        0 15px 47px 0 rgba(0, 0, 0, 0.05),
        0 5px 14px 0 rgba(0, 0, 0, 0.05);
    text-align: center;
    white-space: nowrap;
    padding: 0 10px env(safe-area-inset-bottom);

    a {
        text-align: center;
        width: 25%;
        display: inline-block;
        height: 100%;
        padding: 8px 10px 0;
        font-size: 13px;
        color: #c1c1c1;
        overflow: hidden;
        text-decoration: none;

        &.router-link-exact-active,
        &.active {
            color: $primary;
            font-weight: bold;

            .dark & {
                color: #fff;
            }
        }

        div {
            font-size: 20px;
        }
    }
}

main {
    min-height: calc(100vh - 160px);
}

.title {
    font-weight: bold;
}

.lost-connection {
    padding: 5px;
    background-color: crimson;
    color: white;
    position: fixed;
    width: 100%;
    z-index: 99999;
}

.dark {
    header {
        background-color: $dark-header-bg;
        border-bottom-color: $dark-header-bg !important;

        span {
            color: #f0f6fc;
        }
    }

    .bottom-nav {
        background-color: $dark-bg;
    }
}

.clear-all-toast-btn {
    position: fixed;
    right: 1em;
    bottom: 1em;
    font-size: 1.2em;
    padding: 9px 15px;
    width: 48px;
    box-shadow: 2px 2px 30px rgba(0, 0, 0, 0.2);
    z-index: 100;

    .dark & {
        box-shadow: 2px 2px 30px rgba(0, 0, 0, 0.5);
    }
}

@media (max-width: 770px) {
    .clear-all-toast-btn {
        bottom: 72px;
    }
}
</style>

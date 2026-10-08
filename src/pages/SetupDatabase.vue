<template>
    <AuthLayout v-if="show">
        <div v-if="info.runningSetup" class="setup-progress" role="status">
            <div class="spinner-border" aria-hidden="true"></div>
            <h1 class="auth-title mt-4">{{ $t("Setting up your database") }}</h1>
            <p class="auth-lead">{{ $t("settingUpDatabaseMSG") }}</p>
        </div>

        <form v-else class="auth-form" @submit.prevent="submit">
            <div>
                <p class="auth-step">{{ $t("setupStep", [1, 2]) }}</p>
                <h1 class="auth-title">{{ $t("Choose a database") }}</h1>
                <p class="auth-lead mb-0">{{ $t("setupDatabaseChooseDatabase") }}</p>
            </div>

            <div class="db-options" role="radiogroup" :aria-label="$t('Choose a database')">
                <label
                    v-for="option in dbOptions"
                    :key="option.value"
                    class="db-option"
                    :class="{ active: dbConfig.type === option.value }"
                >
                    <input v-model="dbConfig.type" type="radio" name="db-type" :value="option.value" class="db-radio" />
                    <span class="db-option-body">
                        <span class="db-option-title">
                            {{ option.title }}
                            <span v-if="option.recommended" class="badge">{{ $t("Recommended") }}</span>
                        </span>
                        <span class="db-option-desc">{{ $t(option.desc) }}</span>
                    </span>
                </label>
            </div>

            <div v-if="dbConfig.type === 'mariadb'" class="auth-form">
                <div v-if="!isProvidedMariaDBSocket" class="row g-2">
                    <div class="col-8">
                        <label for="db-hostname" class="form-label">{{ $t("Hostname") }}</label>
                        <input id="db-hostname" v-model="dbConfig.hostname" type="text" class="form-control" required />
                    </div>
                    <div class="col-4">
                        <label for="db-port" class="form-label">{{ $t("Port") }}</label>
                        <input id="db-port" v-model="dbConfig.port" type="text" class="form-control" required />
                    </div>
                </div>

                <i18n-t v-else keypath="mariadbSocketPathDetectedHelptext" tag="div" class="form-text">
                    <code>UPTIME_KUMA_DB_SOCKET</code>
                </i18n-t>

                <div>
                    <label for="db-username" class="form-label">{{ $t("Username") }}</label>
                    <input id="db-username" v-model="dbConfig.username" type="text" class="form-control" required />
                </div>

                <div>
                    <label for="db-password" class="form-label">{{ $t("Password") }}</label>
                    <input id="db-password" v-model="dbConfig.password" type="password" class="form-control" required />
                </div>

                <div>
                    <label for="db-name" class="form-label">{{ $t("dbName") }}</label>
                    <input id="db-name" v-model="dbConfig.dbName" type="text" class="form-control" required />
                </div>

                <div class="form-check form-switch">
                    <input id="sslCheck" v-model="dbConfig.ssl" type="checkbox" role="switch" class="form-check-input" />
                    <label class="form-check-label" for="sslCheck">
                        {{ $t("enableSSL") }} <span class="text-muted">({{ $t("Optional") }})</span>
                    </label>
                    <div class="form-text">{{ $t("mariadbUseSSLHelptext") }}</div>
                </div>

                <div v-if="dbConfig.ssl">
                    <label for="caInput" class="form-label">{{ $t("mariadbCaCertificateLabel") }}</label>
                    <textarea
                        id="caInput"
                        v-model="dbConfig.ca"
                        class="form-control"
                        placeholder="-----BEGIN CERTIFICATE-----"
                        rows="5"
                    ></textarea>
                    <div class="form-text">{{ $t("mariadbCaCertificateHelptext") }}</div>
                </div>
            </div>

            <button class="btn btn-primary w-100" type="submit" :disabled="disabledButton">
                {{ $t("Next") }}
            </button>
        </form>
    </AuthLayout>
</template>

<script>
import axios from "axios";
import AuthLayout from "../components/AuthLayout.vue";
import { useToast } from "vue-toastification";
import { sleep } from "../util.ts";
const toast = useToast();

export default {
    components: {
        AuthLayout,
    },
    data() {
        return {
            show: false,
            dbConfig: {
                type: undefined, // set in mounted(): embedded MariaDB when the image ships it, else SQLite
                port: 3306,
                hostname: "",
                username: "",
                password: "",
                dbName: "kuma",
                ssl: false,
                ca: "",
            },
            info: {
                needSetup: false,
                runningSetup: false,
                isEnabledEmbeddedMariaDB: false,
            },
        };
    },
    computed: {
        dbOptions() {
            const embedded = this.info.isEnabledEmbeddedMariaDB;
            return [
                ...(embedded ? [{ value: "embedded-mariadb", title: "Embedded MariaDB", desc: "setupDatabaseEmbeddedMariaDB", recommended: true }] : []),
                { value: "sqlite", title: "SQLite", desc: "setupDatabaseSQLite", recommended: !embedded },
                { value: "mariadb", title: "MariaDB / MySQL", desc: "setupDatabaseMariaDB" },
            ];
        },
        disabledButton() {
            return this.dbConfig.type === undefined || this.info.runningSetup;
        },
        isProvidedMariaDBSocket() {
            return this.info.isEnabledMariaDBSocket;
        },
    },
    async mounted() {
        let res = await axios.get("/setup-database-info");
        this.info = res.data;
        this.dbConfig.type = this.info.isEnabledEmbeddedMariaDB ? "embedded-mariadb" : "sqlite";

        if (this.info && this.info.needSetup === false) {
            location.href = "/setup";
        } else {
            this.show = true;
        }
    },
    methods: {
        async submit() {
            this.info.runningSetup = true;

            try {
                await axios.post("/setup-database", {
                    dbConfig: this.dbConfig,
                });
                await sleep(2000);
                await this.goToMainServerWhenReady();
            } catch (e) {
                toast.error(e.response?.data || e.message);
            } finally {
                this.info.runningSetup = false;
            }
        },

        async goToMainServerWhenReady() {
            try {
                console.log("Trying...");
                let res = await axios.get("/setup-database-info");
                if (res.data && res.data.needSetup === false) {
                    this.show = false;
                    location.href = "/setup";
                } else {
                    if (res.data) {
                        this.info = res.data;
                    }
                    throw new Error("not ready");
                }
            } catch (e) {
                console.log("Not ready yet");
                await sleep(2000);
                await this.goToMainServerWhenReady();
            }
        },

        test() {
            this.$root.toastError("not implemented");
        },
    },
};
</script>

<style lang="scss" scoped>
.db-options {
    display: grid;
    gap: 12px;
}

.db-option {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 16px 18px;
    border: 1px solid #e6e6e6;
    border-radius: var(--ui-radius);
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease;

    &:hover {
        border-color: #9a9a9a;
    }

    &.active {
        border-color: #121212;
        background-color: rgba(18, 18, 18, 0.03);
    }

    .dark & {
        border-color: #2a2a2a;

        &:hover {
            border-color: #6b6b6b;
        }

        &.active {
            border-color: #fff;
            background-color: rgba(255, 255, 255, 0.04);
        }
    }
}

.db-radio {
    appearance: none;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin-top: 3px;
    border: 1.5px solid #9a9a9a;
    border-radius: 50%;

    &:checked {
        border-color: #121212;
        background: radial-gradient(circle, #121212 0 4px, transparent 4.5px);
    }

    &:focus-visible {
        outline: 2px solid #9a9a9a;
        outline-offset: 2px;
    }

    .dark &:checked {
        border-color: #fff;
        background: radial-gradient(circle, #fff 0 4px, transparent 4.5px);
    }
}

.db-option-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.db-option-title {
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;

    .badge {
        font-size: 0.6875rem;
        background: #121212;
        color: #fff;

        .dark & {
            background: #fff;
            color: #121212;
        }
    }
}

.db-option-desc {
    font-size: 0.8125rem;
    color: #6b6b6b;

    .dark & {
        color: #9a9a9a;
    }
}

.setup-progress {
    text-align: center;
}
</style>

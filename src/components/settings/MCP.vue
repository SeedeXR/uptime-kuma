<template>
    <div class="mcp">
        <p class="lead-text">{{ $t("mcpLead") }}</p>

        <!-- Server URL -->
        <section class="block">
            <label class="form-label">{{ $t("MCP server URL") }}</label>
            <CopyableInput v-model="mcpURL" :readonly="true" />
            <div class="form-text">{{ $t("mcpUrlHelp") }}</div>
        </section>

        <!-- New token, shown once -->
        <section v-if="newToken" class="block token-created" data-testid="mcp-new-token">
            <h5>{{ $t("mcpTokenCreated") }}</h5>
            <p class="form-text mt-0">{{ $t("mcpTokenOnce") }}</p>
            <CopyableInput v-model="newToken" :readonly="true" />

            <label class="form-label mt-3">Claude Code</label>
            <CopyableInput v-model="claudeCodeCommand" :readonly="true" />

            <label class="form-label mt-3">{{ $t("mcpOtherClients") }}</label>
            <textarea class="form-control config" :value="jsonConfig" readonly rows="9"></textarea>

            <button type="button" class="btn btn-normal mt-3" @click="newToken = null">{{ $t("Done") }}</button>
        </section>

        <!-- Create token -->
        <section v-else class="block">
            <h5>{{ $t("Create token") }}</h5>
            <form class="token-form" @submit.prevent="createToken">
                <div>
                    <label for="mcp-token-name" class="form-label">{{ $t("Name") }}</label>
                    <input
                        id="mcp-token-name"
                        v-model="form.name"
                        type="text"
                        class="form-control"
                        :placeholder="$t('mcpTokenNamePlaceholder')"
                        required
                        data-testid="mcp-token-name"
                    />
                </div>

                <div>
                    <span class="form-label d-block">{{ $t("Access") }}</span>
                    <div class="choice-cards" role="radiogroup">
                        <label v-for="opt in accessOptions" :key="opt.value" class="choice-card" :class="{ active: form.scope === opt.value }">
                            <input v-model="form.scope" type="radio" name="mcp-scope" :value="opt.value" />
                            <span>
                                <span class="choice-title">{{ $t(opt.title) }}</span>
                                <span class="choice-desc">{{ $t(opt.desc) }}</span>
                            </span>
                        </label>
                    </div>
                </div>

                <div>
                    <label for="mcp-token-expiry" class="form-label">{{ $t("Expires") }}</label>
                    <select id="mcp-token-expiry" v-model="form.days" class="form-select">
                        <option :value="30">{{ $t("mcpDays", [30]) }}</option>
                        <option :value="90">{{ $t("mcpDays", [90]) }}</option>
                        <option :value="365">{{ $t("mcpDays", [365]) }}</option>
                        <option :value="0">{{ $t("Never") }}</option>
                    </select>
                </div>

                <div>
                    <button type="submit" class="btn btn-primary" :disabled="processing" data-testid="mcp-create-token">
                        {{ $t("Create token") }}
                    </button>
                </div>
            </form>
        </section>

        <!-- Tokens -->
        <section class="block">
            <h5>{{ $t("Tokens") }}</h5>
            <p v-if="tokens.length === 0" class="form-text">{{ $t("mcpNoTokens") }}</p>
            <div v-for="t in tokens" :key="t.id" class="token-row" data-testid="mcp-token-row">
                <div>
                    <div class="token-name">
                        {{ t.name }}
                        <span class="badge" :class="t.scope === 'mcp-write' ? 'bg-dark' : 'bg-secondary'">
                            {{ t.scope === "mcp-write" ? $t("Read & write") : $t("Read only") }}
                        </span>
                    </div>
                    <div class="form-text mt-1">
                        {{ $t("apiKey-" + t.status) }}
                        · {{ $t("Expires") }}: {{ t.expires || $t("Never") }}
                    </div>
                </div>
                <div class="token-actions">
                    <button v-if="t.active" class="btn btn-normal btn-sm" @click="setActive(t.id, false)">{{ $t("Disable") }}</button>
                    <button v-else class="btn btn-normal btn-sm" @click="setActive(t.id, true)">{{ $t("Enable") }}</button>
                    <button class="btn btn-danger btn-sm" @click="confirmDelete(t.id)">{{ $t("Delete") }}</button>
                </div>
            </div>
        </section>

        <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="deleteToken">
            {{ $t("mcpDeleteConfirm") }}
        </Confirm>
    </div>
</template>

<script>
import dayjs from "dayjs";
import CopyableInput from "../CopyableInput.vue";
import Confirm from "../Confirm.vue";

export default {
    components: {
        CopyableInput,
        Confirm,
    },
    data() {
        return {
            form: { name: "", scope: "mcp-read", days: 90 },
            accessOptions: [
                { value: "mcp-read", title: "Read only", desc: "mcpReadDesc" },
                { value: "mcp-write", title: "Read & write", desc: "mcpWriteDesc" },
            ],
            newToken: null,
            processing: false,
            deleteID: null,
        };
    },
    computed: {
        mcpURL() {
            return this.$root.baseURL.replace(/\/+$/, "") + "/mcp";
        },
        tokens() {
            return Object.values(this.$root.apiKeyList).filter((k) => k.scope && k.scope.startsWith("mcp-"));
        },
        claudeCodeCommand() {
            return `claude mcp add --transport http seede-xr ${this.mcpURL} --header "Authorization: Bearer ${this.newToken}"`;
        },
        jsonConfig() {
            const config = {
                mcpServers: {
                    "seede-xr": { type: "http", url: this.mcpURL, headers: { Authorization: `Bearer ${this.newToken}` } },
                },
            };
            return JSON.stringify(config, null, 2);
        },
    },
    methods: {
        /**
         * Create an MCP token (an API key with an MCP scope)
         * @returns {void}
         */
        createToken() {
            this.processing = true;
            const key = {
                name: this.form.name,
                active: 1,
                scope: this.form.scope,
                expires: this.form.days ? dayjs().add(this.form.days, "day").format("YYYY-MM-DD HH:mm") : null,
            };
            this.$root.addAPIKey(key, (res) => {
                this.processing = false;
                if (res.ok) {
                    this.newToken = res.key;
                    this.form = { name: "", scope: "mcp-read", days: 90 };
                } else {
                    this.$root.toastError(res.msg);
                }
            });
        },

        /**
         * Enable or disable a token
         * @param {number} id Token (api key) ID
         * @param {boolean} active Enable when true
         * @returns {void}
         */
        setActive(id, active) {
            this.$root.getSocket().emit(active ? "enableAPIKey" : "disableAPIKey", id, (res) => this.$root.toastRes(res));
        },

        /**
         * Ask before deleting a token
         * @param {number} id Token (api key) ID
         * @returns {void}
         */
        confirmDelete(id) {
            this.deleteID = id;
            this.$refs.confirmDelete.show();
        },

        /**
         * Delete the selected token
         * @returns {void}
         */
        deleteToken() {
            this.$root.deleteAPIKey(this.deleteID, (res) => this.$root.toastRes(res));
        },
    },
};
</script>

<style lang="scss" scoped>
.lead-text {
    color: #6b6b6b;
    margin-bottom: 28px;

    .dark & {
        color: #9a9a9a;
    }
}

.block {
    margin-bottom: 36px;
}

.token-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 520px;
}

.token-created {
    padding: 20px;
    border: 1px solid #e6e6e6;
    border-radius: var(--ui-radius);

    .dark & {
        border-color: #2a2a2a;
    }
}

.config {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8125rem;
}

.token-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid #e6e6e6;

    .dark & {
        border-color: #2a2a2a;
    }
}

.token-name {
    font-weight: 600;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
}

.token-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}
</style>

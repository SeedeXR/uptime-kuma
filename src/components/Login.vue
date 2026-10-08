<template>
    <AuthLayout>
        <h1 class="auth-title">{{ $t("Welcome back") }}</h1>
        <p class="auth-lead">{{ $t("loginLead") }}</p>

        <form aria-label="Login Form" class="auth-form" @submit.prevent="submit">
            <template v-if="!tokenRequired">
                <input
                    id="floatingInput"
                    v-model="username"
                    type="text"
                    class="form-control auth-input"
                    :placeholder="$t('Username')"
                    :aria-label="$t('Username')"
                    autocomplete="username"
                    required
                />

                <HiddenInput
                    id="floatingPassword"
                    v-model="password"
                    :placeholder="$t('Password')"
                    autocomplete="current-password"
                    :required="true"
                />
            </template>

            <div v-else>
                <label for="otp" class="form-label">{{ $t("Token") }}</label>
                <input
                    id="otp"
                    ref="otpInput"
                    v-model="token"
                    type="text"
                    maxlength="6"
                    class="form-control auth-input"
                    placeholder="123456"
                    autocomplete="one-time-code"
                    required
                />
            </div>

            <div class="login-row">
                <div class="remember">
                    <input id="remember" v-model="$root.remember" type="checkbox" value="remember-me" class="form-check-input" />
                    <label class="form-check-label" for="remember">
                        {{ $t("Remember me") }}
                    </label>
                </div>
                <router-link v-if="!tokenRequired" to="/forgot-password" class="forgot-link">
                    {{ $t("Forgot password?") }}
                </router-link>
            </div>

            <button class="w-100 btn btn-primary" type="submit" :disabled="processing">
                {{ $t("Login") }}
            </button>

            <div v-if="res && !res.ok" class="alert alert-danger mb-0" role="alert">
                {{ $t(res.msg) }}
            </div>
        </form>
    </AuthLayout>
</template>

<script>
import HiddenInput from "./HiddenInput.vue";
import AuthLayout from "./AuthLayout.vue";

export default {
    components: {
        HiddenInput,
        AuthLayout,
    },
    data() {
        return {
            processing: false,
            username: "",
            password: "",
            token: "",
            res: null,
            tokenRequired: false,
        };
    },

    watch: {
        tokenRequired(newVal) {
            if (newVal) {
                this.$nextTick(() => {
                    this.$refs.otpInput?.focus();
                });
            }
        },
    },

    mounted() {
        document.title += " - Login";
    },

    unmounted() {
        document.title = document.title.replace(" - Login", "");
    },

    methods: {
        /**
         * Submit the user details and attempt to log in
         * @returns {void}
         */
        submit() {
            this.processing = true;

            this.$root.login(this.username, this.password, this.token, (res) => {
                this.processing = false;

                if (res.tokenRequired) {
                    this.tokenRequired = true;
                } else {
                    this.res = res;
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.login-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.forgot-link {
    font-size: 0.875rem;
}

// Not .form-check: its (RTL-processed) float/negative-margin rule shoves the box out of line
.remember {
    display: flex;
    align-items: center;
    gap: 8px;

    .form-check-input {
        margin: 0;
    }
}
</style>

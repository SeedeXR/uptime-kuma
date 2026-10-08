<template>
    <AuthLayout data-cy="setup-form">
        <form class="auth-form" @submit.prevent="submit">
            <div>
            <p class="auth-step">{{ $t("setupStep", [2, 2]) }}</p>
            <h1 class="auth-title">{{ $t("Create your admin account") }}</h1>
            <p class="auth-lead mb-0">{{ $t("setupAdminLead") }}</p>
            </div>

            <input
                id="floatingInput"
                v-model="username"
                type="text"
                class="form-control auth-input"
                :placeholder="$t('Username')"
                :aria-label="$t('Username')"
                autocomplete="username"
                required
                data-cy="username-input"
            />

            <div>
                <HiddenInput
                    id="floatingPassword"
                    v-model="password"
                    :placeholder="$t('Password')"
                    autocomplete="new-password"
                    :required="true"
                    data-cy="password-input"
                />
                <p class="auth-hint">{{ $t("setupPasswordHint") }}</p>
            </div>

            <div>
            <input
                id="repeat"
                v-model="repeatPassword"
                type="password"
                class="form-control auth-input"
                :class="{ 'is-invalid': passwordMismatch }"
                :placeholder="$t('Repeat Password')"
                :aria-label="$t('Repeat Password')"
                autocomplete="new-password"
                required
                data-cy="password-repeat-input"
            />
            <p v-if="passwordMismatch" class="auth-hint text-danger">{{ $t("PasswordsDoNotMatch") }}</p>
            </div>

            <button
                class="w-100 btn btn-primary"
                type="submit"
                :disabled="processing || passwordMismatch"
                data-cy="submit-setup-form"
            >
                {{ $t("Create") }}
            </button>

            <p class="auth-hint text-center">{{ $t("setupTeamHint") }}</p>
        </form>
    </AuthLayout>
</template>

<script>
import AuthLayout from "../components/AuthLayout.vue";
import HiddenInput from "../components/HiddenInput.vue";

export default {
    components: {
        AuthLayout,
        HiddenInput,
    },
    data() {
        return {
            processing: false,
            username: "",
            password: "",
            repeatPassword: "",
        };
    },
    computed: {
        /**
         * Show the mismatch as soon as the repeat field is as long as the password
         * @returns {boolean} true when both are filled and differ
         */
        passwordMismatch() {
            return this.repeatPassword.length >= this.password.length && this.repeatPassword !== this.password;
        },
    },
    mounted() {
        // TODO: Check if it is a database setup

        this.$root.getSocket().emit("needSetup", (needSetup) => {
            if (!needSetup) {
                this.$router.push("/");
            }
        });
    },
    methods: {
        /**
         * Submit form data for processing
         * @returns {void}
         */
        submit() {
            this.processing = true;

            if (this.password !== this.repeatPassword) {
                this.$root.toastError("PasswordsDoNotMatch");
                this.processing = false;
                return;
            }

            this.$root.getSocket().emit("setup", this.username, this.password, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.processing = true;

                    this.$root.login(this.username, this.password, "", () => {
                        this.processing = false;
                        this.$router.push("/");
                    });
                }
            });
        },
    },
};
</script>

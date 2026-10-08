<template>
    <AuthLayout>
        <template v-if="!done">
            <h1 class="auth-title">{{ $t("Choose a new password") }}</h1>
            <p class="auth-lead">{{ $t("resetPasswordLead") }}</p>

            <form class="auth-form" @submit.prevent="submit">
                <div>
                    <HiddenInput
                        v-model="password"
                        :placeholder="$t('New Password')"
                        autocomplete="new-password"
                        :required="true"
                    />
                    <p class="auth-hint">{{ $t("setupPasswordHint") }}</p>
                </div>

                <div>
                    <input
                        v-model="repeatPassword"
                        type="password"
                        class="form-control auth-input"
                        :class="{ 'is-invalid': passwordMismatch }"
                        :placeholder="$t('Repeat New Password')"
                        :aria-label="$t('Repeat New Password')"
                        autocomplete="new-password"
                        required
                    />
                    <p v-if="passwordMismatch" class="auth-hint text-danger">{{ $t("PasswordsDoNotMatch") }}</p>
                </div>

                <button class="w-100 btn btn-primary" type="submit" :disabled="processing || passwordMismatch">
                    {{ $t("Update password") }}
                </button>
                <router-link to="/forgot-password" class="auth-hint text-center">
                    {{ $t("Need a new link?") }}
                </router-link>
            </form>
        </template>

        <template v-else>
            <h1 class="auth-title">{{ $t("Password updated") }}</h1>
            <p class="auth-lead">{{ $t("resetPasswordDoneLead") }}</p>
            <router-link to="/dashboard" class="w-100 btn btn-primary">{{ $t("Sign in") }}</router-link>
        </template>
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
            password: "",
            repeatPassword: "",
            processing: false,
            done: false,
        };
    },
    computed: {
        passwordMismatch() {
            return this.repeatPassword.length >= this.password.length && this.repeatPassword !== this.password;
        },
    },
    methods: {
        /**
         * Set the new password using the token from the emailed link
         * @returns {void}
         */
        submit() {
            if (this.password !== this.repeatPassword) {
                this.$root.toastError("PasswordsDoNotMatch");
                return;
            }
            this.processing = true;
            const token = String(this.$route.query.token || "");
            this.$root.getSocket().emit("resetPasswordWithToken", { token, newPassword: this.password }, (res) => {
                this.processing = false;
                if (res.ok) {
                    this.done = true;
                } else {
                    this.$root.toastRes(res);
                }
            });
        },
    },
};
</script>

<template>
    <AuthLayout>
        <template v-if="!sent">
            <h1 class="auth-title">{{ $t("Reset your password") }}</h1>
            <p class="auth-lead">{{ $t("forgotPasswordLead") }}</p>

            <form class="auth-form" @submit.prevent="submit">
                <input
                    v-model="email"
                    type="email"
                    class="form-control auth-input"
                    :placeholder="$t('Email')"
                    :aria-label="$t('Email')"
                    autocomplete="username"
                    required
                />
                <button class="w-100 btn btn-primary" type="submit" :disabled="processing">
                    {{ $t("Send reset link") }}
                </button>
                <router-link to="/dashboard" class="auth-hint text-center">{{ $t("Back to sign in") }}</router-link>
            </form>
        </template>

        <template v-else>
            <h1 class="auth-title">{{ $t("Check your email") }}</h1>
            <p class="auth-lead">{{ $t("forgotPasswordSent", [email]) }}</p>
            <router-link to="/dashboard" class="w-100 btn btn-primary">{{ $t("Back to sign in") }}</router-link>
        </template>
    </AuthLayout>
</template>

<script>
import AuthLayout from "../components/AuthLayout.vue";

export default {
    components: {
        AuthLayout,
    },
    data() {
        return {
            email: "",
            processing: false,
            sent: false,
        };
    },
    methods: {
        /**
         * Ask the server to email a reset link (the answer is the same whether or not the account exists)
         * @returns {void}
         */
        submit() {
            this.processing = true;
            this.$root.getSocket().emit("requestPasswordReset", this.email, (res) => {
                this.processing = false;
                if (res.ok) {
                    this.sent = true;
                } else {
                    this.$root.toastRes(res);
                }
            });
        },
    },
};
</script>

<template>
    <main class="not-found">
        <img src="/brand-logo.svg" alt="Seede XR Studios" class="brand-logo" />
        <p class="code">404</p>
        <h1 class="title">{{ $t("Page Not Found") }}</h1>
        <p class="lead">{{ $t("notFoundLead") }}</p>
        <div class="actions">
            <button type="button" class="btn btn-normal" @click="goBack">{{ $t("Go back") }}</button>
            <a href="/" class="btn btn-primary">{{ $t("Home") }}</a>
        </div>
    </main>
</template>

<script>
export default {
    methods: {
        /**
         * Go back 1 in browser history
         * @returns {void}
         */
        goBack() {
            history.back();
        },
    },
};
</script>

<style scoped lang="scss">
.not-found {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px 24px;
    text-align: center;
}

.brand-logo {
    height: 104px;
    margin-bottom: 24px;

    // Lockup is black; flip it for the dark theme
    .dark & {
        filter: invert(1);
    }
}

.code {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #6b6b6b;
}

.title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
}

.lead {
    max-width: 360px;
    color: #6b6b6b;

    .dark & {
        color: #9a9a9a;
    }
}

.actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
}
</style>

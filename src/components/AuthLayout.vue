<template>
    <!-- Full-screen split used by login and first-run setup: matrix art left, content right -->
    <div class="auth-split">
        <div class="auth-art">
            <MatrixRain v-if="!$root.isMobile" />
        </div>

        <div class="auth-panel">
            <div class="auth-card">
                <img src="/brand-logo.svg" alt="Seede XR Studios" class="brand-logo" />
                <slot />
            </div>
        </div>
    </div>
</template>

<script>
import MatrixRain from "./MatrixRain.vue";

export default {
    components: {
        MatrixRain,
    },
};
</script>

<style lang="scss" scoped>
.auth-split {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: #fff;

    .dark & {
        background: #0a0a0a;
    }

    @media (max-width: 767.98px) {
        grid-template-columns: 1fr;

        .auth-art {
            display: none;
        }
    }
}

.auth-art {
    background: #000;
    overflow: hidden;
}

.auth-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    overflow-y: auto;
}

.auth-card {
    width: 100%;
    max-width: 360px;
    margin: auto 0;
}

.brand-logo {
    display: block;
    height: 104px;
    margin: 0 auto 36px;

    // Lockup is black; flip it for the dark theme
    .dark & {
        filter: invert(1);
    }
}
</style>

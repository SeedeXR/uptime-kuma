<template>
    <div class="daily-uptime">
        <div class="bars" role="img" :aria-label="$t('uptimeBarPercent', [uptimeText])">
            <span v-for="day in bars" :key="day.key" class="bar" :class="day.level" :title="day.title" />
        </div>
        <div class="legend">
            <span class="span-90">{{ $t("uptimeBarDaysAgo", [90]) }}</span>
            <span class="span-30">{{ $t("uptimeBarDaysAgo", [30]) }}</span>
            <span class="rule" />
            <span>{{ $t("uptimeBarPercent", [uptimeText]) }}</span>
            <span class="rule" />
            <span>{{ $t("Today") }}</span>
        </div>
    </div>
</template>

<script>
import dayjs from "dayjs";

const DAYS = 90;

export default {
    props: {
        /** Daily buckets from /api/status-page/heartbeat: [{ timestamp (UTC midnight, s), up, down }] */
        days: {
            type: Array,
            default: () => [],
        },
    },
    computed: {
        bars() {
            const byKey = {};
            for (const d of this.days) {
                byKey[d.timestamp] = d;
            }
            // Same UTC-midnight keys as UptimeCalculator.getDailyKey()
            const today = Math.floor(Date.now() / 86400000) * 86400;
            const bars = [];
            for (let i = DAYS - 1; i >= 0; i--) {
                const key = today - i * 86400;
                const d = byKey[key];
                const total = d ? d.up + d.down : 0;
                const date = dayjs.unix(key).utc().format("MMM D, YYYY");
                if (!total) {
                    bars.push({ key, level: "none", title: `${date} · ${this.$t("No data")}` });
                    continue;
                }
                const uptime = d.up / total;
                // ponytail: fixed thresholds, make them per-page settings if anyone asks
                const level = uptime === 1 ? "up" : uptime >= 0.95 ? "partial" : "down";
                bars.push({ key, level, title: `${date} · ${this.formatPercent(uptime)}%` });
            }
            return bars;
        },

        uptimeText() {
            let up = 0;
            let down = 0;
            for (const d of this.days) {
                up += d.up;
                down += d.down;
            }
            return up + down ? this.formatPercent(up / (up + down)) : "–";
        },
    },
    methods: {
        /**
         * Format a 0..1 ratio as a percentage without misleading rounding up to 100
         * @param {number} ratio Uptime ratio
         * @returns {string} e.g. "99.98"
         */
        formatPercent(ratio) {
            return (Math.floor(ratio * 10000) / 100).toString();
        },
    },
};
</script>

<style lang="scss" scoped>
.bars {
    display: flex;
    gap: 3px;
    height: 34px;
}

.bar {
    flex: 1;
    min-width: 2px;
    border-radius: var(--ui-radius-sm);
    background: var(--status-none);
    transition: opacity 0.15s ease, transform 0.15s ease;

    &:hover {
        opacity: 0.75;
        transform: scaleY(1.08);
    }

    &.up {
        background: var(--status-up);
    }

    &.partial {
        background: var(--status-partial);
    }

    &.down {
        background: var(--status-down);
    }
}

.legend {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
    font-size: 0.8125rem;
    color: var(--status-muted);
    white-space: nowrap;

    .rule {
        flex: 1;
        height: 1px;
        background: var(--status-line);
    }
}

.span-30 {
    display: none;
}

// Phones show the last 30 days, like most hosted status pages
@media (max-width: 640px) {
    .bar:nth-child(-n + 60) {
        display: none;
    }

    .span-90 {
        display: none;
    }

    .span-30 {
        display: inline;
    }
}
</style>

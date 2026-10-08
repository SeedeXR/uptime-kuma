<template>
    <canvas ref="canvas" class="matrix-rain" aria-hidden="true" />
</template>

<script>
// Black & white "digital rain" for the login screen. Canvas 2D, ~24 fps, paused by the
// browser in background tabs; a single static frame when the user prefers reduced motion.
const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789XR";
const FONT_SIZE = 16;
const FRAME_MS = 1000 / 24;

export default {
    mounted() {
        this.ctx = this.$refs.canvas.getContext("2d");
        this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        this.resize();
        this.onResize = () => this.resize();
        window.addEventListener("resize", this.onResize);

        if (this.reducedMotion) {
            return;
        }
        let last = 0;
        const loop = (t) => {
            this.raf = requestAnimationFrame(loop);
            if (t - last >= FRAME_MS) {
                last = t;
                this.step();
            }
        };
        this.raf = requestAnimationFrame(loop);
    },

    beforeUnmount() {
        cancelAnimationFrame(this.raf);
        window.removeEventListener("resize", this.onResize);
    },

    methods: {
        /**
         * Match the canvas to its box (device-pixel sharp) and reset the columns
         * @returns {void}
         */
        resize() {
            const canvas = this.$refs.canvas;
            const dpr = window.devicePixelRatio || 1;
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.width = width;
            this.height = height;
            this.ctx.fillStyle = "#000";
            this.ctx.fillRect(0, 0, width, height);
            // Each column's head row; random start so the screen isn't empty at first
            this.drops = Array.from({ length: Math.ceil(width / FONT_SIZE) }, () =>
                Math.floor((Math.random() * height) / FONT_SIZE)
            );
            // No animation loop to repaint: draw a settled static frame now
            if (this.reducedMotion) {
                for (let i = 0; i < 60; i++) {
                    this.step();
                }
            }
        },

        /**
         * Draw one frame: fade the previous frame, then one glyph per column
         * @returns {void}
         */
        step() {
            const ctx = this.ctx;
            ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.font = `${FONT_SIZE}px monospace`;

            for (let i = 0; i < this.drops.length; i++) {
                const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                // Mostly grey trail with occasional bright white heads
                ctx.fillStyle = Math.random() > 0.92 ? "#ffffff" : "#8a8a8a";
                ctx.fillText(glyph, i * FONT_SIZE, this.drops[i] * FONT_SIZE);

                if (this.drops[i] * FONT_SIZE > this.height && Math.random() > 0.975) {
                    this.drops[i] = 0;
                }
                this.drops[i]++;
            }
        },
    },
};
</script>

<style scoped>
.matrix-rain {
    display: block;
    width: 100%;
    height: 100%;
    background: #000;
}
</style>

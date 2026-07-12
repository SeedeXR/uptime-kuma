import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import postCssScss from "postcss-scss";
import postcssRTLCSS from "postcss-rtlcss";

const viteCompressionFilter = /\.(js|mjs|json|css|html|svg)$/i;

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        port: 3000,
    },
    define: {
        FRONTEND_VERSION: JSON.stringify(process.env.npm_package_version),
        "process.env": {},
    },
    plugins: [
        vue(),
        tailwindcss(),
        visualizer({
            filename: "tmp/dist-stats.html",
        }),
        viteCompression({
            algorithm: "gzip",
            filter: viteCompressionFilter,
        }),
        viteCompression({
            algorithm: "brotliCompress",
            filter: viteCompressionFilter,
        }),
    ],
    css: {
        postcss: {
            parser: postCssScss,
            map: false,
            plugins: [postcssRTLCSS],
        },
    },
    build: {
        commonjsOptions: {
            include: [/.js$/],
        },
        rollupOptions: {
            output: {
                // Split heavy, rarely-changing vendor libs into their own long-term-cacheable
                // chunks. Only eager deps are grouped here; lazy deps (e.g. chart.js via
                // PingChart) are left to Vite's automatic code-splitting so they stay lazy.
                manualChunks(id) {
                    if (!id.includes("node_modules")) {
                        return;
                    }
                    if (/[\\/]node_modules[\\/](vue|@vue|vue-router|vue-i18n|vue-toastification|vuedraggable)[\\/]/.test(id)) {
                        return "vendor-vue";
                    }
                    if (/[\\/]node_modules[\\/](dayjs|axios|mitt|nanoid|jwt-decode|qs)[\\/]/.test(id)) {
                        return "vendor-core";
                    }
                },
            },
        },
    },
});

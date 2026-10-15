// @ts-nocheck — separate vitest config (excluded from svelte-check via tsconfig)
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: { environment: "jsdom", include: ["src/**/*.{test,spec}.ts"] }
});

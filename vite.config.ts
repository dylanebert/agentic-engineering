import { gzipSync } from "node:zlib";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import typegpu from "unplugin-typegpu/vite";
import { defineConfig, type Plugin } from "vite";

export const HERO_GZIP_BUDGET = 200_000;

const heroBudget = (): Plugin => ({
  name: "hero-gzip-budget",
  generateBundle(_, bundle) {
    const hero = Object.values(bundle).find(
      (entry) => entry.type === "chunk" && entry.name === "hero-engine",
    );
    if (!hero || hero.type !== "chunk") {
      throw new Error("lazy hero chunk is missing");
    }
    const bytes = gzipSync(hero.code).byteLength;
    if (bytes > HERO_GZIP_BUDGET) {
      throw new Error(`hero chunk ${bytes} exceeds ${HERO_GZIP_BUDGET}`);
    }
  },
});

export default defineConfig({
  base: "/agentic-engineering/",
  plugins: [typegpu(), svelte(), heroBudget()],
  build: { target: "esnext" },
});

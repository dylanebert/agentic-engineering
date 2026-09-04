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
    const closure = new Set<string>();
    const visit = (file: string) => {
      if (closure.has(file)) return;
      closure.add(file);
      const entry = bundle[file];
      if (entry?.type === "chunk") {
        for (const dependency of [...entry.imports, ...entry.dynamicImports]) visit(dependency);
        // Emitted assets are URL references rather than imports in Rollup's bundle graph.
        for (const candidate of Object.keys(bundle)) if (entry.code.includes(candidate.split("/").at(-1)!)) visit(candidate);
      }
    };
    visit(hero.fileName);
    const bytes = [...closure].reduce((sum, file) => {
      const entry = bundle[file];
      if (!entry) return sum;
      const payload = entry.type === "chunk" ? entry.code : entry.source;
      return sum + gzipSync(payload).byteLength;
    }, 0);
    if (bytes > HERO_GZIP_BUDGET) {
      throw new Error(`hero lazy closure ${bytes} exceeds ${HERO_GZIP_BUDGET}`);
    }
  },
});

export default defineConfig({
  base: "/agentic-engineering/",
  plugins: [typegpu(), svelte(), heroBudget()],
  build: { target: "esnext" },
});

import { execSync } from "node:child_process";
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

/** The literal the committed `index.html` carries in place of a build SHA, written there by
 * `harness/site-rum.ts` in the kex workspace. Duplicated rather than imported: this repo deploys on
 * its own, so it cannot depend on kex at build time. */
const SITE_RUM_VERSION_TOKEN = "__SITE_RUM_VERSION__";

/** The identifier this build reports as Datadog RUM `version` and publishes its source maps under
 * (`datadog-ci sourcemaps upload --release-version` in `.github/workflows/pages.yml` passes the same
 * `github.sha`). Error Tracking resolves a minified frame only when the two match, so both sides
 * read the commit and nothing else. A local build falls back to the working commit, and a checkout
 * without git to `dev`, so `bun run build` never fails for want of a SHA. */
const buildVersion = (): string => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
};

/** Fills the RUM snippet's version token in the built `index.html`. Runs `post` so the token is
 * replaced in the final HTML, after Vite has rewritten asset URLs. */
const siteRumVersion = (): Plugin => {
  const version = buildVersion();
  return {
    name: "site-rum-version",
    transformIndexHtml: {
      order: "post",
      handler: (html: string) => html.replaceAll(SITE_RUM_VERSION_TOKEN, version),
    },
  };
};

export default defineConfig({
  base: "/agentic-engineering/",
  plugins: [typegpu(), svelte(), heroBudget(), siteRumVersion()],
  // `hidden` emits a `.map` beside every chunk but no `//# sourceMappingURL` comment: the maps go
  // to Datadog from CI and are deleted before the Pages artifact is built, so a visitor never sees
  // them and a scraper never finds a link to them.
  build: { target: "esnext", sourcemap: "hidden" },
});

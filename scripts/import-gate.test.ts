import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { figureArms } from "./arms";
import { figures } from "./manifest";
import { grammar } from "./vocabulary";

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "article-import-gate-")); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
async function file(name: string, content: string) {
  const path = join(root, "dist", name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
async function run() {
  const arm = figureArms({ root, dist: join(root, "dist"), url: "", figures, grammar })[0]!;
  expect(arm.title).toBe("substrate: dist contains no Shallot or typegpu");
  expect(arm.pure).toBe(true);
  // The pure production arm must not access browser fixtures.
  await arm.run(undefined as never, undefined as never);
}
const packages = ["@dylanebert/shallot", "typegpu", "unplugin-typegpu"];
const forms = [
  (pkg: string) => `import { value } from '${pkg}';`,
  (pkg: string) => `const value = import("${pkg}");`,
];
const artifacts = [
  (code: string) => file("assets/lazy/deep.js", code),
  (code: string) => file("assets/lazy/deep.mjs", code),
  (code: string) => file("assets/lazy/deep.cjs", code),
  (code: string) => file("nested/page.html", `<script type="module">${code}</script>`),
  (code: string) => file("nested/page.html", `<script>${code}</script>`),
  (code: string) => file("nested/page.html", `<script type=text/javascript>${code}</script>`),
];

test("source-map examples and non-executable assets are not imports", async () => {
  await file("assets/main.js", "export const ready = true;");
  const examples = packages.flatMap((pkg) => forms.map((form) => form(pkg))).join("\n");
  await file("assets/main.js.map", JSON.stringify({ version: 3, sources: ["example.ts"], names: [], mappings: "", sourcesContent: [examples] }));
  await file("examples.txt", examples);
  await file("page.html", `<p>${examples}</p><script type="application/json">${JSON.stringify(examples)}</script>`);
  await run();
});
for (const pkg of packages) for (const [formIndex, form] of forms.entries()) {
  for (const [artifactIndex, artifact] of artifacts.entries()) {
    test(`figure-1.1 rejects ${pkg}, form ${formIndex}, artifact ${artifactIndex}`, async () => {
      await file("assets/main.js", "export const ready = true;");
      await artifact(form(pkg));
      await expect(run()).rejects.toThrow("predicate:figure-1.1");
    });
  }
}
for (const [index, artifact] of artifacts.entries()) {
  test(`relative imports pass in artifact ${index}`, async () => {
    await artifact(packages.flatMap((pkg) => forms.map((form) => form(`./${pkg}.js`))).join("\n"));
    await run();
  });
}
for (const population of ["missing", "directory", "map-only", "empty-js", "empty-script", "html-only"]) {
  test(`${population} cannot pass vacuously`, async () => {
    if (population !== "missing") await mkdir(join(root, "dist"));
    if (population === "map-only") await file("main.js.map", "{}");
    if (population === "empty-js") await file("main.js", " \n");
    if (population === "empty-script") await file("index.html", "<script> </script>");
    if (population === "html-only") await file("index.html", "<p>hello</p>");
    await expect(run()).rejects.toThrow();
  });
}
for (const prohibited of ["http://localhost:1234", "https://127.0.0.1:4321", "vite dev", "vite serve", "vite preview"]) {
  test(`figure-1.2 still scans non-executable output: ${prohibited}`, async () => {
    await file("main.js", "export const ready = true;");
    await file("main.js.map", JSON.stringify({ sourcesContent: [prohibited] }));
    await expect(run()).rejects.toThrow("predicate:figure-1.2");
  });
}

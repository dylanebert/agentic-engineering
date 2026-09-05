import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test as baseTest, expect, chromium, type Browser, type BrowserContext, type LaunchOptions, type TestInfo } from "@playwright/test";
import { captureArms, figureArms, proseArms, selfArms, selfFixtures, textArms, type Arm, type ArmInput } from "./arms";
import { requireDisplay } from "./display";

export type Group = "figure" | "capture" | "text" | "prose" | "self";
export type Cohort = "plain" | "gpu" | "fresh";
export type Input = { id: string; root: string; mode: "files" | "fallback" | "self"; omitHostIcon?: boolean; omitRuntimeCors?: boolean; runtimeControl?: "healthy" | "error"; originFault?: "off-base" | "base-icon" | "self-html-icon"; hashes: Record<string, string> };
export type Case = { id: string; input: Input; group: Group; title: string; cohort: Cohort; red?: string; fixture?: { identity: string; requirement: string }; };
export type Mutation = { label: string; path?: string; needle?: string | string[]; replacement?: string | string[]; grep?: string; predicate: string; runtime?: boolean; cohort?: Cohort; mode?: "fallback" | "golden"; buildRed?: string };
const here = dirname(fileURLToPath(import.meta.url));
const factories = { figure: figureArms, capture: captureArms, text: textArms, prose: proseArms, self: selfArms };
export const emptyInput: ArmInput = { root: here, dist: join(here, "dist"), url: "", figures: [], grammar: { colors: {} } as ArmInput["grammar"] };
const sha = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
export function bytes(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  function visit(dir: string, prefix = "") {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = join(prefix, entry.name);
      if (entry.isDirectory()) visit(join(dir, entry.name), name);
      else if (entry.isFile()) result[name] = sha(readFileSync(join(dir, entry.name)));
    }
  }
  visit(root);
  return result;
}
/** Re-enumerate paths as well as bytes on every read; ignored outputs stay excluded. */
export function sourceSnapshots(root: string): () => Record<string, string> {
  return () => {
    const listing = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" });
    expect(listing.error, "predicate:runner.source-enumeration").toBeUndefined();
    expect(listing.status, "predicate:runner.source-enumeration").toBe(0);
    const paths = listing.stdout.split("\0").filter(Boolean).sort();
    expect(paths.length, "predicate:runner.source-population").toBeGreaterThan(0);
    return Object.fromEntries(paths.map(path => [path, sha(readFileSync(join(root, path)))]));
  };
}
export function record(event: string, details: Record<string, unknown> = {}) {
  const line = JSON.stringify({ at: new Date().toISOString(), event, runner: process.pid, ...details });
  if (process.env.CAMPAIGN_LEDGER) appendFileSync(process.env.CAMPAIGN_LEDGER, line + "\n");
  console.log(`campaign ${line}`);
}
export function nonemptyGpu(options: LaunchOptions) {
  expect(Object.keys(options).length, "predicate:runner.gpu-config").toBeGreaterThan(0);
  expect(JSON.stringify(options), "predicate:runner.gpu-distinct").not.toBe("{}");
}
export async function launch(options: LaunchOptions, cohort: string) {
  if (cohort === "gpu") nonemptyGpu(options);
  record("launch-request", { cohort, options });
  const browser = await chromium.launch({ headless: true, ...options });
  const session = await browser.newBrowserCDPSession();
  const processes = await session.send("SystemInfo.getProcessInfo");
  const pid = processes.processInfo.find((p) => p.type === "browser")?.id;
  await session.detach();
  if (!pid) { await browser.close(); throw new Error("browser PID unavailable"); }
  record("launch", { cohort, pid, options });
  return { browser, pid };
}
export async function closeBrowser(handle: Awaited<ReturnType<typeof launch>>) {
  record("close-request", { pid: handle.pid });
  await handle.browser.close();
  // Browser.close awaits the owned child process. A surviving PID is not graceful completion.
  let alive = false;
  try { process.kill(handle.pid, 0); alive = true; } catch {}
  record("close", { pid: handle.pid, alive });
  expect(alive, "predicate:runner.graceful-close").toBe(false);
}
export const test = baseTest.extend<{}, { browserPid: number }>({
  browser: [async ({ launchOptions }, use, info) => {
    const handle = await launch(launchOptions, info.project.name === "chromium-webgpu" ? "gpu" : info.project.name === "fresh-start" ? "fresh" : "plain");
    try { await use(handle.browser); } finally { await closeBrowser(handle); }
  }, { scope: "worker" }],
  browserPid: [async ({ browser }, use) => {
    const session = await browser.newBrowserCDPSession();
    const processes = await session.send("SystemInfo.getProcessInfo");
    await session.detach();
    await use(processes.processInfo.find((p) => p.type === "browser")!.id);
  }, { scope: "worker" }],
});

/** Assertion errors only: a timeout, syntax error or different predicate cannot earn a witness. */
export async function namedRed(predicate: string, body: () => Promise<unknown>) {
  let thrown: unknown;
  try { await body(); } catch (error) { thrown = error; }
  expect(thrown, `witness ${predicate} must reject`).toBeDefined();
  expect(thrown instanceof Error && "matcherResult" in thrown, `witness ${predicate} must be an assertion`).toBe(true);
  expect((thrown as Error).message, `witness ${predicate} must reach its named predicate`).toContain(`predicate:${predicate}`);
  record("named-red", { predicate, message: (thrown as Error).message });
}
export const HOST_PATHS = ["/favicon.ico"];
// A local 16x16 32-bit ICO (DIB plus AND mask), not an article/branding asset.
export const hostIcon = Buffer.alloc(22 + 40 + 16 * 16 * 4 + 16 * 4);
hostIcon.writeUInt16LE(1, 2); hostIcon.writeUInt16LE(1, 4);
hostIcon[6] = 16; hostIcon[7] = 16;
hostIcon.writeUInt16LE(1, 10); hostIcon.writeUInt16LE(32, 12);
hostIcon.writeUInt32LE(hostIcon.length - 22, 14); hostIcon.writeUInt32LE(22, 18);
hostIcon.writeUInt32LE(40, 22); hostIcon.writeInt32LE(16, 26); hostIcon.writeInt32LE(32, 30);
hostIcon.writeUInt16LE(1, 34); hostIcon.writeUInt16LE(32, 36);
for (let i = 62; i < 62 + 1024; i += 4) { hostIcon[i] = 128; hostIcon[i + 1] = 128; hostIcon[i + 2] = 128; hostIcon[i + 3] = 255; }
export const types: Record<string, string> = { html: "text/html", js: "text/javascript", css: "text/css", svg: "image/svg+xml", json: "application/json", png: "image/png", woff2: "font/woff2", ttf: "font/ttf", webp: "image/webp", jpg: "image/jpeg", mp4: "video/mp4", ico: "image/x-icon", map: "application/json" };
export async function serve(input: Input) {
  expect(bytes(input.root), "predicate:runner.immutable-input").toEqual(input.hashes);
  const fulfilled = new Set<string>();
  const declared = input.omitHostIcon ? [] : HOST_PATHS;
  const server = createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (declared.includes(pathname)) {
      fulfilled.add(pathname);
      record("host-fulfilled", { input: input.id, pathname, declared });
      res.writeHead(200, { "content-type": "image/x-icon" }); res.end(input.originFault === "self-html-icon" ? selfFixtures["/hue"] : hostIcon); return;
    }
    if (input.originFault === "base-icon" && pathname === "/agentic-engineering/favicon.ico") { res.writeHead(200); res.end(hostIcon); return; }
    if (input.originFault === "off-base" && !pathname.startsWith("/agentic-engineering/")) { res.writeHead(200); res.end(readFileSync(join(input.root, "dist/index.html"))); return; }
    if (!pathname.startsWith("/agentic-engineering/")) {
      record("off-base", { input: input.id, pathname, status: 404 });
      res.writeHead(404); res.end("outside article base"); return;
    }
    let path = pathname.slice("/agentic-engineering/".length);
    if (path === "" || path.endsWith("/")) path = "index.html";
    try {
      const body = input.mode === "self" ? selfFixtures["/" + path] : readFileSync(join(input.root, "dist", path));
      if (body === undefined) throw new Error("missing fixture");
      res.writeHead(200, { "content-type": input.mode === "self" ? "text/html" : types[path.split(".").at(-1)!] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      record("missing-asset", { input: input.id, path, pathname });
      res.writeHead(input.mode === "fallback" && path !== "favicon.ico" ? 200 : 404, { "content-type": "text/plain" });
      res.end(`missing asset: ${path}`);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no case origin");
  const origin = `http://127.0.0.1:${address.port}`;
  record("origin", { input: input.id, origin });
  return { origin, declared, fulfilled, url: origin + "/agentic-engineering/", close: async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    record("origin-close", { input: input.id, origin });
  } };
}
export async function resolveArms(input: Input, group: Group, url: string, output?: string): Promise<Arm[]> {
  const manifest = await import(pathToFileURL(join(input.root, "manifest.ts")).href);
  const vocabulary = await import(pathToFileURL(join(input.root, "vocabulary.ts")).href);
  return factories[group]({ root: output ?? input.root, dist: join(input.root, "dist"), url: group === "self" ? url.replace(/\/$/, "") : url, figures: manifest.figures, grammar: vocabulary.grammar });
}
let sharedContext: BrowserContext | undefined;
export async function closeSharedContext() { if (sharedContext) { await sharedContext.close(); record("context-close", { id: "shared-fixture-context" }); } sharedContext = undefined; }
export async function observe(browser: Browser, pid: number, item: Case, info: TestInfo) {
  const served = process.env.CAMPAIGN_FIXTURE_FAULT === "wrong-origin" && item.input.id === "plain-b" ? stagedCases().find(c => c.input.id === "plain-a")!.input : item.input;
  const origin = await serve(served);
  const reuse = process.env.CAMPAIGN_FIXTURE_FAULT === "context-reuse" && item.cohort === "plain";
  const reused = reuse && Boolean(sharedContext);
  const context = reuse && sharedContext ? sharedContext : await browser.newContext(item.group === "capture" ? { deviceScaleFactor: 2 } : {});
  if (reuse) sharedContext = context;
  record(reused ? "context-reuse" : "context", { id: item.id, pid, origin: origin.origin });
  try {
    const page = await context.newPage();
    page.on("response", response => { if (response.status() >= 400) record("http-error", { id: item.id, url: response.url(), status: response.status() }); });
    const session = await context.newCDPSession(page);
    const target = await session.send("Target.getTargetInfo");
    await session.detach();
    record("page", { id: item.id, pid, target: target.targetInfo.targetId });
    if (item.input.mode !== "self") {
      const stamp = await context.request.get(origin.url + "__case.json");
      expect(await stamp.json(), "predicate:runner.origin-input").toEqual({ id: item.input.id });
    }
    if (item.fixture) {
      const run = async () => {
        const markers = await context.cookies("http://runner.invalid");
        expect(markers, "predicate:runner.context-isolation").toEqual([]);
        await context.addCookies([{ name: "case", value: item.id, url: "http://runner.invalid" }]);
        record("fixture-marker", { id: item.id, pid, clean: true });
        const moduleRoot = process.env.CAMPAIGN_FIXTURE_FAULT === "wrong-expectation" && item.input.id === "plain-b" ? join(item.input.root, "..", "plain-a") : item.input.root;
        const declaration = await import(pathToFileURL(join(moduleRoot, "manifest.ts")).href);
        expect(declaration.fixtureIdentity, "predicate:runner.expectation-input").toBe(item.fixture!.identity);
        await page.goto(origin.url);
        expect(await page.locator("body").getAttribute("data-identity"), "predicate:runner.bundle-input").toBe(item.fixture!.identity);
        const adapter = await page.evaluate(async () => Boolean(await navigator.gpu?.requestAdapter()));
        expect(adapter, "predicate:runner.fixture-adapter").toBe(item.fixture!.requirement === "gpu");
        record("fixture-observed", { id: item.id, pid, adapter, requirement: item.fixture!.requirement });
      };
      if (item.red) await namedRed(item.red, run); else await run();
      record("executed", { id: item.id, pid, cohort: item.cohort, fixture: true });
      return;
    }
    if (item.group === "capture") mkdirSync(info.outputDir, { recursive: true });
    const arms = await resolveArms(item.input, item.group, origin.url, item.group === "capture" ? info.outputDir : undefined);
    const arm = arms.find(a => a.title === item.title);
    expect(arm, "predicate:runner.arm-population").toBeDefined();
    const run = () => Promise.resolve(arm!.run({ page, browser, request: context.request }, info));
    if (item.red) await namedRed(item.red, run); else await run();
    if (!item.input.omitHostIcon) await context.request.get(origin.origin + "/favicon.ico");
    expect([...origin.fulfilled].sort(), "predicate:runner.host-set").toEqual([...origin.declared].sort());
    record("host-set", { id: item.id, declared: origin.declared, fulfilled: [...origin.fulfilled] });
    record("executed", { id: item.id, title: item.title, input: item.input.id, cohort: item.cohort, pid, red: item.red ?? null });
  } finally {
    if (!reuse) {
      await context.close();
      record("context-close", { id: item.id, pid });
    }
    await origin.close();
  }
}
export function stagedCases(): Case[] {
  const path = join(here, "cases.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
}

export type FixtureDeclaration = { id: string; requirement: "pure" | Cohort };
/** Stages the self-test's independently declared subjects through the production runner/config. */
export function fixtureCampaign(declarations: FixtureDeclaration[], fault: string) {
  const work = mkdtempSync(join(process.env.CAMPAIGN_OUTPUT ?? tmpdir(), "article-runner-fixture-"));
  symlinkSync(join(here, "node_modules"), join(work, "node_modules"), "dir");
  for (const file of ["arms.ts", "campaign.ts", "instrument.spec.ts", "playwright.config.ts", "png.ts", "reduced.ts", "variance.ts", "region.ts", "display.ts"]) cpSync(join(here, file), join(work, file));
  writeFileSync(join(work, "package.json"), JSON.stringify({ type: "module", private: true }));
  const cases: Case[] = [];
  for (const declaration of declarations) {
    if (declaration.requirement === "pure" || fault === "dropped-case" && declaration.id === "plain-b") continue;
    const root = join(work, "inputs", declaration.id);
    mkdirSync(join(root, "dist"), { recursive: true });
    writeFileSync(join(root, "dist", "index.html"), `<body><script src="/agentic-engineering/identity.js"></script></body>`);
    writeFileSync(join(root, "dist", "identity.js"), `document.body.dataset.identity=${JSON.stringify(declaration.id)}`);
    writeFileSync(join(root, "dist", "__case.json"), JSON.stringify({ id: declaration.id }));
    writeFileSync(join(root, "manifest.ts"), `export const fixtureIdentity=${JSON.stringify(declaration.id)};`);
    const cohort = fault === "fresh-reuse" && declaration.requirement === "fresh" || fault === "merged-cohort" && declaration.requirement === "gpu" ? "plain" : declaration.requirement;
    cases.push({ id: declaration.id, title: declaration.id, group: "figure", cohort, fixture: { identity: declaration.id, requirement: declaration.requirement }, input: { id: declaration.id, root, mode: "files", hashes: bytes(root) } });
  }
  writeFileSync(join(work, "cases.json"), JSON.stringify(cases));
  const ledger = join(work, "ledger.jsonl");
  writeFileSync(ledger, "");
  const args = ["bunx", "playwright", "test", "--config", "playwright.config.ts"];
  record("fixture-child-start", { work, fault, args });
  const child = spawnSync(args[0], args.slice(1), { cwd: work, encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: { ...process.env, CAMPAIGN_LEDGER: ledger, CAMPAIGN_FIXTURE_CHILD: "1", CAMPAIGN_FIXTURE_FAULT: fault, CAMPAIGN_SELECTION: "fixture-child", ...(fault === "pure" ? { KEX_SIMULATE_NO_DISPLAY: "1" } : {}) } });
  const log = (child.stdout ?? "") + (child.stderr ?? "");
  writeFileSync(join(work, "runner.log"), log);
  const events = readFileSync(ledger, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  record("fixture-child-end", { work, fault, exit: child.status });
  return { work, events, log, exit: child.status };
}

/** Highest changed-subject class; package fields are classified by parsed keys. */
export function changedClass(paths: string[], beforePackage = {}, afterPackage = {}): number {
  let result = 1;
  for (const path of paths) {
    if (path === "package.json") {
      const a = beforePackage as Record<string, unknown>, b = afterPackage as Record<string, unknown>;
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) result = Math.max(result, key === "scripts" ? 2 : 4);
    } else if (/^(src|public|vendor)\/|\.css$|\.html$|bun\.lock$|vite\.config|snapshots\//.test(path)) result = 4;
    else if (/\.spec\.ts$|\/(arms|png|variance|reduced|shallot-pixels)\.ts$/.test(path)) result = Math.max(result, 3);
    else if (/\/region\.ts$/.test(path)) result = Math.max(result, 1);
    else if (/^scripts\//.test(path)) result = Math.max(result, 2);
    else throw new Error(`unclassified changed path: ${path}`);
  }
  return result;
}

export async function campaign(selection: string, mutations: Mutation[]) {
  const pure = selection === "pure" || selection === "runner";
  if (selection !== "pure" && !requireDisplay("campaign")) return;
  const repo = resolve(here, "..");
  const work = mkdtempSync(join(process.env.CAMPAIGN_OUTPUT ?? tmpdir(), "article-campaign-"));
  process.env.CAMPAIGN_LEDGER = join(work, "ledger.jsonl");
  record("owner-start", { selection, repo, work });
  // Each run owns a new directory. No inherited capture or staging output is overwritten.
  symlinkSync(join(repo, "node_modules"), join(work, "node_modules"), "dir");
  for (const file of ["runtime.ts", "runtime.spec.ts", "arms.ts", "campaign.ts", "instrument.spec.ts", "figures.spec.ts", "capture.spec.ts", "playwright.config.ts", "png.ts", "reduced.ts", "variance.ts", "region.ts", "display.ts"]) cpSync(join(here, file), join(work, file));
  cpSync(join(here, "capture.spec.ts-snapshots"), join(work, "capture.spec.ts-snapshots"), { recursive: true });
  writeFileSync(join(work, "package.json"), JSON.stringify({ type: "module", private: true }));
  cpSync(join(repo, "src/lib/figures.ts"), join(work, "manifest.ts"));
  cpSync(join(repo, "src/lib/vocabulary.ts"), join(work, "vocabulary.ts"));
  const sourceBytes = sourceSnapshots(repo);
  const initial = sourceBytes();
  writeFileSync(join(work, "source-before.json"), JSON.stringify(initial, null, 2));
  const runBuild = (dest: string, red?: string) => {
    const start = new Date().toISOString();
    const result = Bun.spawnSync(["bun", "run", "build", "--outDir", dest], { cwd: repo, stdout: "pipe", stderr: "pipe" });
    const log = result.stdout.toString() + result.stderr.toString();
    writeFileSync(dest + ".log", log);
    record("build", { start, dest, exit: result.exitCode, red });
    if (red) {
      if (result.exitCode === 0 || !log.includes(red)) throw new Error(`build witness did not reach ${red}`);
    } else if (result.exitCode !== 0) throw new Error(`build failed: ${dest}.log`);
  };
  const makeInput = (id: string, mode: Input["mode"] = "files", built?: Input): Input => {
    const root = join(work, "inputs", id);
    mkdirSync(root, { recursive: true });
    if (!pure && mode !== "self") {
      if (built) cpSync(join(built.root, "dist"), join(root, "dist"), { recursive: true });
      else runBuild(join(root, "dist"));
      writeFileSync(join(root, "dist", "__case.json"), JSON.stringify({ id }));
    }
    cpSync(join(repo, "src/lib/figures.ts"), join(root, "manifest.ts"));
    cpSync(join(repo, "src/lib/vocabulary.ts"), join(root, "vocabulary.ts"));
    // Text oracle's external declaration is resolved from this input, never from the page.
    const declaration = require(join(root, "manifest.ts"));
    writeFileSync(join(root, "manifest.json"), JSON.stringify({ figures: declaration.figures, sectionOrder: declaration.sectionOrder }));
    return { id, root, mode, hashes: bytes(root) };
  };
  const baseline = makeInput("baseline");
  const self = makeInput("self", "self");
  const cases: Case[] = [];
  const add = (input: Input, group: Group, arm: Arm, cohort: Cohort, suffix: string, red?: string) => cases.push({ id: `${group}/${arm.title}/${cohort}/${suffix}`, input, group, title: arm.title, cohort, red });
  if (selection === "runtime") {
    const { stageRuntime } = await import("./runtime");
    stageRuntime(baseline, cases);
  } else if (!pure) {
    const groups: Group[] = selection === "narrow" || selection === "runtime-witnesses" ? [] : selection === "instrument" || selection === "R3" ? ["self", "figure", "capture", "text", "prose"] : [selection as Group];
    for (const group of groups) for (const arm of factories[group](emptyInput)) {
      if (group === "self" && arm.pure) continue;
      const cohorts: Cohort[] = ["plain"];
      // R3 changes assertions, not the rendered subject. The figure wrapper retains
      // its five repetitions for repetition-sensitive rendered-subject closes.
      const repeats = group === "figure" && selection === "figure" ? 5 : 1;
      for (let repetition = 1; repetition <= repeats; repetition++) for (const cohort of cohorts) add(group === "self" ? self : baseline, group, arm, cohort, `baseline-${repetition}`);
    }
    if (selection === "instrument" || selection === "R3" || selection === "narrow" || selection === "runtime-witnesses") {
      const selected = selection === "runtime-witnesses" ? mutations.filter(m => m.runtime) : selection === "narrow" ? mutations.filter(m => m.label.startsWith("new hero")) : mutations;
      for (const [index, mutation] of selected.entries()) {
        const id = `mutation-${index}-${mutation.label.replace(/[^a-z0-9]+/gi, "-")}`;
        let input: Input;
        if (mutation.mode) {
          input = makeInput(id, mutation.mode === "fallback" ? "fallback" : "files", baseline);
          if (mutation.mode === "golden") {
            const css = readdirSync(join(input.root, "dist/assets")).find(f => f.endsWith(".css"));
            if (!css) throw new Error("golden mutation stylesheet absent");
            const path = join(input.root, "dist/assets", css);
            const original = readFileSync(path, "utf8");
            if (!original.includes("548px")) throw new Error("golden mutation missed");
            writeFileSync(path, original.replace("548px", "549px"));
            input.hashes = bytes(input.root);
          }
        } else {
          const path = join(repo, mutation.path!);
          const original = readFileSync(path);
          const needles = Array.isArray(mutation.needle) ? mutation.needle : [mutation.needle!];
          const replacements = Array.isArray(mutation.replacement) ? mutation.replacement : [mutation.replacement!];
          let changed = original.toString();
          needles.forEach((needle, i) => {
            if (!changed.includes(needle)) throw new Error(`mutation ${mutation.label} missed ${needle}`);
            changed = changed.replace(needle, replacements[i]);
          });
          writeFileSync(path, changed);
          try {
            if (mutation.buildRed) {
              runBuild(join(work, id), mutation.buildRed);
              continue;
            }
            input = makeInput(id);
          } finally {
            writeFileSync(path, original);
            if (!readFileSync(path).equals(original)) throw new Error(`restoration failed ${path}`);
            record("restored", { label: mutation.label, path, sha256: sha(original) });
          }
        }
        if (mutation.runtime) {
          cases.push({ id: `runtime/${id}/gpu/1`, input: input!, group: "figure", title: mutation.label, cohort: "gpu", red: mutation.predicate });
          continue;
        }
        const group: Group = mutation.mode === "golden" ? "capture" : "figure";
        const arms = factories[group](emptyInput).filter(a => a.title.includes(mutation.grep!));
        if (arms.length !== 1) throw new Error(`mutation ${mutation.label} selects ${arms.length} arms`);
        if (selection === "narrow") add(baseline, group, arms[0], mutation.cohort ?? "plain", `baseline-${mutation.label}`);
        add(input!, group, arms[0], mutation.cohort ?? "plain", mutation.label, mutation.predicate);
      }
      const { stageRuntime } = await import("./runtime");
      stageRuntime(baseline, cases, "healthy", true);
      stageRuntime(baseline, cases, "error", true);
      const corsInput = { ...cases.find(c => c.id === "runtime/healthy/plain/1")!.input, id: "cors-header-removed", omitRuntimeCors: true };
      for (let n = 1; n <= 3; n++) cases.push({ id: `runtime/cors-header-removed/plain/${n}`, input: corsInput, group: "figure", title: "anonymous external script requires CORS", cohort: "plain", red: "runtime.zero-errors" });
      const noIcon = { ...cases.find(c => c.id === "runtime/healthy/gpu/1")!.input, omitHostIcon: true };
      cases.push({ id: "runtime/host-icon-removed/gpu/1", input: noIcon, group: "figure", title: "host-icon-removed", cohort: "gpu", red: "runtime.zero-errors" });
      // One pristine baseline observation after all staged witnesses, with source already restored.
      add(baseline, "figure", figureArms(emptyInput).find(a => a.title.includes("non-interference"))!, "plain", "restoration-control");
    }
  }
  expect(sourceBytes(), "predicate:runner.source-before-browser").toEqual(initial);
  record("source-before-browser", { files: Object.keys(initial).length, equal: true });
  writeFileSync(join(work, "cases.json"), JSON.stringify(cases, null, 2));
  writeFileSync(join(work, "selection.json"), JSON.stringify({ selection, pure }));
  const args = ["bunx", "playwright", "test", "--config", "playwright.config.ts"];
  if (selection === "runtime") args.push(...process.argv.slice(2));
  record("playwright-start", { args, work });
  const child = Bun.spawnSync(args, { cwd: work, stdout: "inherit", stderr: "inherit", env: { ...process.env, DEBUG: "pw:browser", DEBUG_COLORS: "0", CAMPAIGN_SELECTION: selection } });
  record("playwright-end", { exit: child.exitCode });
  const final = sourceBytes();
  writeFileSync(join(work, "source-after.json"), JSON.stringify(final, null, 2));
  expect(final, "predicate:runner.whole-tree-restoration").toEqual(initial);
  record("owner-end", { exit: child.exitCode, work });
  if (child.exitCode !== 0) throw new Error(`campaign failed; retained work: ${work}`);
  return work;
}

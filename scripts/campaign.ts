import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test as baseTest, expect, chromium, type Browser, type BrowserContext, type LaunchOptions, type TestInfo } from "@playwright/test";
import { captureArms, figureArms, proseArms, selfArms, selfFixtures, textArms, type Arm, type ArmInput } from "./arms";
import { requireDisplay } from "./display";

export const subjects = ["pure", "runner", "figure", "capture", "text", "prose", "runtime", "spectrum", "geometry"] as const;
export type Subject = typeof subjects[number];
export type Selection = { only: Subject[]; qualify: boolean; full?: boolean; collect?: boolean; witness?: string; resume?: string };
export function select(args: string[]): Selection {
  const result: Selection = { only: [], qualify: false };
  let selected = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue;
    if (["--only", "--full", "--pure", "--runner"].includes(arg)) {
      if (selected) throw new Error("conflicting selection");
      selected = true;
      result.full = arg === "--full";
      const names = arg === "--only" ? (args[++i] ?? "").split(",") : arg === "--full" ? subjects.filter(s => s !== "pure" && s !== "runner") : [arg.slice(2)];
      if (!names.length || names.some(name => !subjects.includes(name as Subject)) || new Set(names).size !== names.length) throw new Error("unknown/empty selection");
      result.only = names as Subject[];
    } else if (arg === "--qualify") result.qualify = true;
    else if (arg === "--collect") result.collect = true;
    else if (arg === "--witness" || arg === "--resume") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`empty ${arg}`);
      if (arg === "--witness") result.witness = value; else result.resume = value;
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (!selected || !result.only.length) throw new Error("explicit nonempty selection required");
  if (result.witness && !result.qualify) throw new Error("--witness requires --qualify");
  // These observers do not exist yet. Never turn their selection into an empty success.
  if (result.only.some(s => s === "spectrum" || s === "geometry")) throw new Error("missing observer body: spectrum/geometry");
  return result;
}

export type Group = "figure" | "capture" | "text" | "prose" | "self";
export type Cohort = "plain" | "gpu" | "fresh";
export type Input = { id: string; root: string; mode: "files" | "fallback" | "self"; omitHostIcon?: boolean; omitRuntimeCors?: boolean; runtimeControl?: "healthy" | "error"; originFault?: "off-base" | "base-icon" | "self-html-icon"; hashes: Record<string, string> };
export type Case = { id: string; input: Input; group: Group; title: string; cohort: Cohort; red?: string; subject?: string; fixture?: { identity: string; requirement: string }; };
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
const recorderStart = new Date(Date.now() - process.uptime() * 1000).toISOString();
export function processIdentity(pid: number) {
  const result = spawnSync("ps", ["-p", String(pid), "-o", "pid=,ppid=,lstart=,command="], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout.trim()) throw new Error(`owned process identity unavailable: ${pid}`);
  return result.stdout.trim();
}
let recorderRegistered = false;
export function record(event: string, details: Record<string, unknown> = {}) {
  if (!recorderRegistered) {
    recorderRegistered = true;
    record("recorder", { identity: processIdentity(process.pid), argv: process.argv });
  }
  const line = JSON.stringify({ at: new Date().toISOString(), monotonicMs: performance.now(), event, runner: process.pid, parent: process.ppid, recorderStart, ...details });
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
  record("launch", { cohort, pid, identity: processIdentity(pid), options });
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
export function subjectHash(item: Case, observerRoot = here) {
  const observers = item.id.startsWith("runtime/") ? ["runtime.ts", "runtime.spec.ts", "region.ts", "png.ts"] : ["arms.ts", item.group === "capture" ? "capture.spec.ts" : "figures.spec.ts", "png.ts", "reduced.ts", "variance.ts"];
  return sha(JSON.stringify({ id: item.id, title: item.title, group: item.group, cohort: item.cohort, red: item.red, input: { ...item.input, root: undefined }, observers: Object.fromEntries([...observers, "playwright.config.ts"].map(file => [file, sha(readFileSync(join(observerRoot, file)))])) }));
}
export function recoveredCases(work: string, candidates: Case[], ancestors: string[] = [], observerRoot = here): string[] {
  if (ancestors.includes(work)) throw new Error("cyclic recovery evidence");
  const events = readFileSync(join(work, "ledger.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  const completed: string[] = [];
  for (const item of candidates) {
    expect(bytes(item.input.root), "predicate:runner.recovery-hashes").toEqual(item.input.hashes);
    expect(item.subject, "predicate:runner.recovery-subject").toBe(subjectHash(item, observerRoot));
    const receipt = events.find(e => e.event === "case-complete" && e.id === item.id && e.pass);
    if (!receipt) {
      const reused = events.find(e => e.event === "reused" && e.ids.includes(item.id));
      if (reused && recoveredCases(reused.from, [item], [...ancestors, work], observerRoot).includes(item.id)) completed.push(item.id);
      continue;
    }
    expect(receipt.subject, "predicate:runner.recovery-subject").toBe(subjectHash(item, observerRoot));
    if (receipt.artifacts) expect(bytes(receipt.output), "predicate:runner.recovery-artifacts").toEqual(receipt.artifacts);
    if (receipt.pure) { completed.push(item.id); continue; }
    expect(events.some(e => e.event === "origin-close" && e.origin === receipt.origin), "predicate:runner.recovery-origin").toBe(true);
    expect(events.some(e => e.event === "context-close" && e.id === item.id && e.pid === receipt.pid), "predicate:runner.recovery-context").toBe(true);
    expect(events.some(e => e.event === "close" && e.pid === receipt.pid && e.alive === false), "predicate:runner.recovery-close").toBe(true);
    expect(events.some(e => e.event === "child-close" && e.nativeCloses?.some((c: any) => c.pid === receipt.pid && c.signal === "null")), "predicate:runner.recovery-native-close").toBe(true);
    completed.push(item.id);
  }
  // Incomplete native lifecycle blocks all later browser work, including unrelated cases.
  for (const event of events.filter(e => e.event === "launch")) {
    expect(events.some(e => e.event === "close" && e.pid === event.pid && !e.alive), "predicate:runner.recovery-close").toBe(true);
    expect(events.some(e => e.event === "child-close" && e.nativeCloses?.some((c: any) => c.pid === event.pid && c.signal === "null" && c.exitCode === "0")), "predicate:runner.recovery-native-close").toBe(true);
  }
  return completed;
}
export async function observe(browser: Browser, pid: number, item: Case, info: TestInfo) {
  const start = performance.now();
  let pass = false;
  record("case-start", { id: item.id, pid, subject: subjectHash(item) });
  const served = process.env.CAMPAIGN_FIXTURE_FAULT === "wrong-origin" && item.input.id === "plain-b" ? stagedCases().find(c => c.input.id === "plain-a")!.input : item.input;
  const origin = await serve(served);
  const reuse = process.env.CAMPAIGN_FIXTURE_FAULT === "context-reuse" && item.cohort === "plain";
  const reused = reuse && Boolean(sharedContext);
  const context = reuse && sharedContext ? sharedContext : await browser.newContext(item.group === "capture" ? { deviceScaleFactor: 2 } : {});
  if (reuse) sharedContext = context;
  let expired = false;
  const deadline = setTimeout(() => {
    expired = true;
    record("case-cancel", { id: item.id, pid, reason: "deadline", elapsedMs: performance.now() - start });
    void context.close().catch(error => record("case-close-error", { id: item.id, error: String(error) }));
  }, Math.max(0, 25_000 - (performance.now() - start)));
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
        if (process.env.CAMPAIGN_FIXTURE_FAULT === "cancel") await page.waitForTimeout(10_000);
      };
      if (item.red) await namedRed(item.red, run); else await run();
      record("executed", { id: item.id, pid, cohort: item.cohort, fixture: true });
      pass = true;
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
    pass = true;
  } finally {
    clearTimeout(deadline);
    if (!reuse) {
      await context.close();
      record("context-close", { id: item.id, pid });
    }
    await origin.close();
    const elapsedMs = performance.now() - start;
    record("case-complete", { id: item.id, pid, subject: subjectHash(item), pass: pass && !expired && elapsedMs <= 30_000, elapsedMs, origin: origin.origin, output: info.outputDir, artifacts: existsSync(info.outputDir) ? bytes(info.outputDir) : undefined });
    expect(expired, "predicate:runner.case-bound").toBe(false);
    expect(elapsedMs, "predicate:runner.case-bound").toBeLessThanOrEqual(30_000);
  }
}
export function stagedCases(): Case[] {
  const path = join(here, "cases.json");
  const cases: Case[] = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
  const pending: string[] | undefined = process.env.CAMPAIGN_FIXTURE_CHILD === "1" || !process.env.CAMPAIGN_PENDING ? undefined : JSON.parse(process.env.CAMPAIGN_PENDING);
  return pending ? cases.filter(item => pending.includes(item.id)) : cases;
}

export async function ownedChild(args: string[], cwd: string, log: string, env: NodeJS.ProcessEnv, cancelWhen?: () => boolean) {
  const start = performance.now();
  writeFileSync(log, "");
  const child = spawn(args[0], args.slice(1), { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  record("child-start", { pid: child.pid, identity: child.pid ? processIdentity(child.pid) : null, args, cwd, log });
  let cancelled = false;
  const interrupt = () => {
    if (!cancelled && child.exitCode === null && child.signalCode === null) {
      cancelled = true;
      record("child-interrupt", { pid: child.pid, signal: "SIGINT" });
      child.kill("SIGINT");
    }
  };
  process.on("SIGINT", interrupt);
  const poll = cancelWhen ? setInterval(() => { if (cancelWhen()) interrupt(); }, 25) : undefined;
  let stderr = "", stdout = "";
  const nativeLaunches: number[] = [];
  const nativeCloses: { pid: number; exitCode: string; signal: string }[] = [];
  child.stdout.on("data", chunk => {
    appendFileSync(log, chunk);
    stdout += chunk.toString();
    const lines = stdout.split("\n"); stdout = lines.pop()!.slice(-16_384);
    for (const line of lines) if (line.startsWith("campaign {") && /"event":"(case-complete|fixture-complete|runtime-case-verdict)"/.test(line)) console.log(line);
  });
  child.stderr.on("data", chunk => {
    appendFileSync(log, chunk); stderr += chunk.toString();
    const lines = stderr.split("\n"); stderr = lines.pop()!.slice(-16_384);
    for (const line of lines) {
      const launch = line.match(/<launched> pid=(\d+)/);
      const close = line.match(/\[pid=(\d+)\] <process did exit: exitCode=([^,]+), signal=([^>]+)>/);
      if (launch) nativeLaunches.push(Number(launch[1]));
      if (close) nativeCloses.push({ pid: Number(close[1]), exitCode: close[2], signal: close[3] });
    }
  });
  try {
    const outcome = await new Promise<{ exit: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (exit, signal) => resolve({ exit, signal }));
    });
    record("child-close", { pid: child.pid, ...outcome, elapsedMs: performance.now() - start, cancelled, nativeLaunches, nativeCloses });
    for (const pid of nativeLaunches) if (!nativeCloses.some(c => c.pid === pid && c.signal === "null" && c.exitCode === "0")) throw new Error(`missing native browser close: ${pid}; ${log}`);
    return { ...outcome, cancelled };
  } finally { if (poll) clearInterval(poll); EventEmitter.prototype.removeListener.call(process, "SIGINT", interrupt); }
}

export type FixtureDeclaration = { id: string; requirement: "pure" | Cohort };
/** Stages the self-test's independently declared subjects through the production runner/config. */
export async function fixtureCampaign(declarations: FixtureDeclaration[], fault: string) {
  const work = mkdtempSync(join(process.env.CAMPAIGN_OUTPUT ?? tmpdir(), "article-runner-fixture-"));
  symlinkSync(join(here, "node_modules"), join(work, "node_modules"), "dir");
  for (const file of ["arms.ts", "campaign.ts", "instrument.spec.ts", "figures.spec.ts", "playwright.config.ts", "png.ts", "reduced.ts", "variance.ts", "region.ts", "display.ts"]) cpSync(join(here, file), join(work, file));
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
  const args = [process.execPath, join(here, "node_modules/@playwright/test/cli.js"), "test", "--config", "playwright.config.ts"];
  record("fixture-child-start", { work, fault, args });
  const child = await ownedChild(args, work, join(work, "runner.log"), { ...process.env, DEBUG: "pw:browser", DEBUG_COLORS: "0", CAMPAIGN_LEDGER: ledger, CAMPAIGN_FIXTURE_CHILD: "1", CAMPAIGN_FIXTURE_FAULT: fault, CAMPAIGN_SELECTION: "fixture-child", ...(fault === "pure" ? { KEX_SIMULATE_NO_DISPLAY: "1" } : {}) }, fault === "cancel" ? () => readFileSync(ledger, "utf8").includes('"event":"fixture-observed"') : undefined);
  const log = readFileSync(join(work, "runner.log"), "utf8");
  const events = readFileSync(ledger, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  record("fixture-child-end", { work, fault, exit: child.exit });
  return { work, events, log, exit: child.exit };
}

/** Union of actual consumers; classes describe cost, never select a constant campaign. */
export function changedReaders(paths: string[], beforePackage = {}, afterPackage = {}): Subject[] {
  const readers = new Set<Subject>();
  const add = (...names: Subject[]) => names.forEach(name => readers.add(name));
  for (const path of paths) {
    if (path === "package.json") {
      const a = beforePackage as Record<string, unknown>, b = afterPackage as Record<string, unknown>;
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        if (key === "scripts") add("pure", "runner"); else subjects.forEach(s => readers.add(s));
      }
    } else if (/^(src|public|vendor)\/|\.css$|\.html$|bun\.lock$|vite\.config|snapshots\//.test(path)) subjects.forEach(s => readers.add(s));
    else if (/\/(runtime|region)\.ts$/.test(path)) add("pure", "runtime");
    else if (/\/runtime\.spec\.ts$/.test(path)) add("runtime");
    else if (/\/figures\.spec\.ts$/.test(path)) add("figure", "text", "prose");
    else if (/\/capture\.spec\.ts$/.test(path)) add("capture");
    else if (/\/(arms|png|reduced|variance)\.ts$/.test(path)) add("pure", "figure", "capture", "text", "prose", "runtime");
    else if (/\/(campaign|playwright\.config)\.ts$/.test(path)) add("pure", "runner", "figure", "capture", "text", "prose", "runtime");
    else if (/\/(instrument|instrument\.spec)\.ts$/.test(path)) add("pure", "runner");
    else if (/\/figures\.ts$/.test(path)) add("figure");
    else if (/\/shot\.ts$/.test(path)) add("capture");
    else if (/\/oracle-text\.ts$/.test(path)) add("text");
    else if (/\/tripwires\.ts$/.test(path)) add("prose");
    else throw new Error(`unknown reader reach: ${path}`);
  }
  return subjects.filter(s => readers.has(s));
}

/** Cost metadata only; selection uses the reader union above. */
export function changedClass(paths: string[], beforePackage = {}, afterPackage = {}): number {
  let result = 1;
  for (const path of paths) {
    if (path === "package.json") {
      const a = beforePackage as Record<string, unknown>, b = afterPackage as Record<string, unknown>;
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) result = Math.max(result, key === "scripts" ? 2 : 4);
    } else if (/^(src|public|vendor)\/|\.css$|\.html$|bun\.lock$|vite\.config|snapshots\//.test(path)) result = 4;
    else if (/\.spec\.ts$|\/(arms|png|variance|reduced|shallot-pixels)\.ts$/.test(path)) result = Math.max(result, 3);
    else if (/\/(region|runtime)\.ts$/.test(path)) result = Math.max(result, 3);
    else if (/^scripts\//.test(path)) result = Math.max(result, 2);
    else throw new Error(`unclassified changed path: ${path}`);
  }
  return result;
}

export async function campaign(selection: string | Selection, mutations: Mutation[]) {
  const entered = performance.now();
  const plan = typeof selection === "string" ? select(["--only", selection]) : select([...(selection.full ? ["--full"] : ["--only", selection.only.join(",")]), ...(selection.qualify ? ["--qualify"] : []), ...(selection.collect ? ["--collect"] : []), ...(selection.witness ? ["--witness", selection.witness] : []), ...(selection.resume ? ["--resume", selection.resume] : [])]);
  const pure = plan.only.every(s => s === "pure" || s === "runner");
  const selectedMutations = plan.qualify || plan.full ? mutations.filter(m => (m.runtime ? plan.qualify && plan.only.includes("runtime") : m.mode === "golden" ? plan.only.includes("capture") : plan.only.includes("figure")) && (!plan.witness || m.label === plan.witness)) : [];
  if (plan.witness && selectedMutations.length !== 1) throw new Error("unknown/non-unique witness");
  // Resolve every selected assertion before building or admitting display work.
  for (const mutation of selectedMutations) if (!mutation.runtime && !mutation.buildRed) {
    const group = mutation.mode === "golden" ? "capture" : "figure";
    if (factories[group](emptyInput).filter(a => a.title.includes(mutation.grep!)).length !== 1) throw new Error(`missing/non-unique mutation body: ${mutation.label}`);
  }
  for (const subject of plan.only) if (subject in factories && !factories[subject as Group](emptyInput).length) throw new Error(`missing body: ${subject}`);
  if (plan.resume && (pure || plan.qualify)) throw new Error("recovery selects ordinary immutable cases only");
  const prebuildCollection = !plan.collect && !pure && !plan.resume ? await campaign({ ...plan, collect: true }, mutations) : undefined;
  if (!plan.collect && plan.only.some(s => s !== "pure") && !requireDisplay("campaign")) throw new Error("display skipped; no observation");
  const repo = resolve(here, "..");
  const work = mkdtempSync(join(process.env.CAMPAIGN_OUTPUT ?? tmpdir(), "article-campaign-"));
  process.env.CAMPAIGN_LEDGER = join(work, "ledger.jsonl");
  record("owner-start", { selection: plan, repo, work, prebuildCollection });
  writeFileSync(join(work, "selection.json"), JSON.stringify(plan));
  const diff = spawnSync("git", ["diff", "--name-only", "origin/main", "--"], { cwd: repo, encoding: "utf8" });
  if (diff.status !== 0) throw new Error("changed reader enumeration failed");
  const changedPaths = diff.stdout.trim().split("\n").filter(Boolean);
  const beforePackage = changedPaths.includes("package.json") ? JSON.parse(spawnSync("git", ["show", "origin/main:package.json"], { cwd: repo, encoding: "utf8" }).stdout) : {};
  const afterPackage = changedPaths.includes("package.json") ? JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) : {};
  const readers = changedPaths.map(path => ({ path, readers: changedReaders([path], beforePackage, afterPackage) }));
  record("reader-selection", { selected: plan.only, changed: readers, deferred: [...new Set(readers.flatMap(r => r.readers))].filter(s => !plan.only.includes(s)) });
  // Each run owns a new directory. No inherited capture or staging output is overwritten.
  symlinkSync(join(repo, "node_modules"), join(work, "node_modules"), "dir");
  for (const file of ["runtime.ts", "runtime.spec.ts", "arms.ts", "campaign.ts", "instrument.spec.ts", "figures.spec.ts", "capture.spec.ts", "playwright.config.ts", "png.ts", "reduced.ts", "variance.ts", "region.ts", "display.ts"]) cpSync(join(here, file), join(work, file));
  if (plan.resume && ["changed-observer", "changed-configuration"].includes(process.env.CAMPAIGN_FIXTURE_FAULT ?? "")) {
    const observer = process.env.CAMPAIGN_FIXTURE_FAULT === "changed-observer";
    const path = join(work, observer ? "figures.spec.ts" : "playwright.config.ts");
    const original = readFileSync(path, "utf8");
    const needle = observer ? "await observe(browser, browserPid, item, info);" : "workers: 1";
    if (!original.includes(needle)) throw new Error("recovery reversal missed its binding");
    writeFileSync(path, original.replace(needle, observer ? "await Promise.resolve();" : "workers: 2"));
    record("recovery-reversal", { path, fault: process.env.CAMPAIGN_FIXTURE_FAULT });
  }
  cpSync(join(here, "capture.spec.ts-snapshots"), join(work, "capture.spec.ts-snapshots"), { recursive: true });
  writeFileSync(join(work, "package.json"), JSON.stringify({ type: "module", private: true }));
  cpSync(join(repo, "src/lib/figures.ts"), join(work, "manifest.ts"));
  cpSync(join(repo, "src/lib/vocabulary.ts"), join(work, "vocabulary.ts"));
  const sourceBytes = sourceSnapshots(repo);
  const initial = sourceBytes();
  writeFileSync(join(work, "source-before.json"), JSON.stringify(initial, null, 2));
  const runBuild = async (dest: string, red?: string) => {
    const start = new Date().toISOString(), started = performance.now();
    const result = await ownedChild([process.execPath, "run", "build", "--outDir", dest], repo, dest + ".log", process.env);
    const log = readFileSync(dest + ".log", "utf8");
    record("build", { start, dest, exit: result.exit, red, elapsedMs: performance.now() - started });
    if (result.cancelled) throw new Error("build cancelled; source restoration required");
    if (red) {
      if (result.exit === 0 || !log.includes(red)) throw new Error(`build witness did not reach ${red}`);
    } else if (result.exit !== 0) throw new Error(`build failed: ${dest}.log`);
  };
  const makeInput = async (id: string, mode: Input["mode"] = "files", built?: Input): Promise<Input> => {
    const root = join(work, "inputs", id);
    mkdirSync(root, { recursive: true });
    if (plan.collect) mkdirSync(join(root, "dist"), { recursive: true });
    if (!pure && !plan.collect && !plan.resume && mode !== "self") {
      if (built) cpSync(join(built.root, "dist"), join(root, "dist"), { recursive: true });
      else await runBuild(join(root, "dist"));
      writeFileSync(join(root, "dist", "__case.json"), JSON.stringify({ id }));
    }
    cpSync(join(repo, "src/lib/figures.ts"), join(root, "manifest.ts"));
    cpSync(join(repo, "src/lib/vocabulary.ts"), join(root, "vocabulary.ts"));
    // Text oracle's external declaration is resolved from this input, never from the page.
    const declaration = require(join(root, "manifest.ts"));
    writeFileSync(join(root, "manifest.json"), JSON.stringify({ figures: declaration.figures, sectionOrder: declaration.sectionOrder }));
    return { id, root, mode, hashes: bytes(root) };
  };
  const baseline = await makeInput("baseline");
  const self = await makeInput("self", "self");
  const cases: Case[] = [];
  let population: Case[] | undefined;
  if (plan.resume) {
    const original: Case[] = JSON.parse(readFileSync(join(plan.resume, "cases.json"), "utf8"));
    const source = (snapshot: Record<string, string>) => Object.fromEntries(Object.entries(snapshot).filter(([path]) => !path.startsWith("scripts/")));
    expect(source(initial), "predicate:runner.recovery-source").toEqual(source(JSON.parse(readFileSync(join(plan.resume, "source-before.json"), "utf8"))));
    const candidates = original.filter(c => plan.only.includes(c.id.startsWith("runtime/") ? "runtime" : c.group as Subject));
    if (!candidates.length) throw new Error("empty recovery selection");
    population = candidates;
    const reused = recoveredCases(plan.resume, candidates, [], work);
    record("reused", { from: plan.resume, ids: reused });
    cases.push(...candidates.filter(c => !reused.includes(c.id)));
    if (!cases.length) {
      writeFileSync(join(work, "cases.json"), JSON.stringify(candidates, null, 2));
      writeFileSync(join(work, "source-after.json"), JSON.stringify(sourceBytes(), null, 2));
      record("owner-end", { exit: 0, work, reused: reused.length, observed: 0 });
      return work;
    }
  }
  const add = (input: Input, group: Group, arm: Arm, cohort: Cohort, suffix: string, red?: string) => cases.push({ id: `${group}/${arm.title}/${cohort}/${suffix}`, input, group, title: arm.title, cohort, red });
  if (plan.only.includes("runner") && plan.qualify) for (const arm of selfArms(emptyInput).filter(arm => !arm.pure)) add(self, "self", arm, "plain", "control");
  if (plan.resume) { /* Only missing immutable cases enter the runner below. */ }
  else if (!pure) {
    if (plan.only.includes("runtime") && !plan.qualify) {
      const { stageRuntime } = await import("./runtime");
      stageRuntime(baseline, cases);
    }
    const groups = plan.only.filter(s => s in factories) as Group[];
    for (const group of groups) for (const arm of factories[group](emptyInput).filter(arm => !plan.witness || selectedMutations.some(m => m.grep && arm.title.includes(m.grep)))) {
      if (group === "self" && arm.pure) continue;
      const cohorts: Cohort[] = ["plain"];
      // Repetitions belong to the rendered subject, not to a narrow assertion close.
      const repeats = group === "figure" && plan.full ? 5 : 1;
      for (let repetition = 1; repetition <= repeats; repetition++) for (const cohort of cohorts) add(group === "self" ? self : baseline, group, arm, cohort, `baseline-${repetition}`);
    }
    if (selectedMutations.length || plan.qualify && plan.only.includes("runtime")) {
      for (const [index, mutation] of selectedMutations.entries()) {
        const id = `mutation-${index}-${mutation.label.replace(/[^a-z0-9]+/gi, "-")}`;
        let input: Input;
        if (plan.collect) {
          if (mutation.buildRed) continue;
          input = await makeInput(id, mutation.mode === "fallback" ? "fallback" : "files");
        } else if (mutation.mode) {
          input = await makeInput(id, mutation.mode === "fallback" ? "fallback" : "files", baseline);
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
              await runBuild(join(work, id), mutation.buildRed);
              continue;
            }
            input = await makeInput(id);
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
        if (!groups.includes(group)) add(baseline, group, arms[0], mutation.cohort ?? "plain", `baseline-${mutation.label}`);
        add(input!, group, arms[0], mutation.cohort ?? "plain", mutation.label, mutation.predicate);
      }
      if (plan.qualify && plan.only.includes("runtime")) {
      const { stageRuntime } = await import("./runtime");
      stageRuntime(baseline, cases, "healthy", true);
      stageRuntime(baseline, cases, "error", true);
      const corsInput = { ...cases.find(c => c.id === "runtime/healthy/plain/1")!.input, id: "cors-header-removed", omitRuntimeCors: true };
      for (let n = 1; n <= 3; n++) cases.push({ id: `runtime/cors-header-removed/plain/${n}`, input: corsInput, group: "figure", title: "anonymous external script requires CORS", cohort: "plain", red: "runtime.zero-errors" });
      const noIcon = { ...cases.find(c => c.id === "runtime/healthy/gpu/1")!.input, omitHostIcon: true };
      cases.push({ id: "runtime/host-icon-removed/gpu/1", input: noIcon, group: "figure", title: "host-icon-removed", cohort: "gpu", red: "runtime.zero-errors" });
      }
      // One pristine baseline observation after all staged witnesses, with source already restored.
      add(baseline, "figure", figureArms(emptyInput).find(a => a.title.includes("non-interference"))!, "plain", "restoration-control");
    }
  }
  expect(sourceBytes(), "predicate:runner.source-before-browser").toEqual(initial);
  record("source-before-browser", { files: Object.keys(initial).length, equal: true });
  for (const item of cases) {
    item.subject = subjectHash(item, work);
    const reader = item.id.startsWith("runtime/") ? "runtime" : item.group === "self" ? "runner" : item.group;
    record("case-binding", { id: item.id, reader, assertion: item.title, subject: item.subject, input: item.input.id, witness: item.red ?? null, changed: readers.filter(r => r.readers.includes(reader)).map(r => r.path) });
  }
  writeFileSync(join(work, "cases.json"), JSON.stringify(population ?? cases, null, 2));
  const args = [join(repo, "node_modules/@playwright/test/cli.js"), "test", "--config", "playwright.config.ts"];
  const env = { ...process.env, DEBUG: "pw:browser", DEBUG_COLORS: "0", CAMPAIGN_SELECTION: JSON.stringify(plan), CAMPAIGN_OWNER: String(process.pid), CAMPAIGN_REPO: repo, CAMPAIGN_PENDING: JSON.stringify(cases.map(c => c.id)) };
  const collection = await ownedChild([process.execPath, ...args, "--list", "--reporter=json"], work, join(work, "collection.log"), env);
  if (collection.exit !== 0) throw new Error(`collection failed: ${work}/collection.log`);
  const collected = JSON.parse(readFileSync(join(work, "collection.log"), "utf8"));
  const titles: string[] = [];
  const visit = (suite: any) => { for (const spec of suite.specs ?? []) titles.push(spec.title); for (const child of suite.suites ?? []) visit(child); };
  visit(collected);
  for (const item of cases) {
    const title = item.id.startsWith("runtime/") && item.cohort === "plain" ? "runtime plain @plain" : `${item.id} @${item.cohort}`;
    if (!titles.includes(title)) throw new Error(`missing collected body: ${item.id}`);
  }
  const expected = new Set(cases.map(item => item.id.startsWith("runtime/") && item.cohort === "plain" ? "runtime plain @plain" : `${item.id} @${item.cohort}`));
  for (const title of titles) if (!expected.has(title) && !(plan.only.includes("pure") && title.endsWith("@pure")) && !(plan.only.includes("runner") && title.endsWith("@runner"))) throw new Error(`unselected collected body: ${title}`);
  if (!titles.length) throw new Error("empty actual collection");
  record("collected", { cases: cases.map(c => c.id), titles, count: titles.length });
  if (plan.collect) { record("owner-end", { exit: 0, collectionOnly: true, work }); return work; }
  record("playwright-start", { args, work });
  const child = await ownedChild([process.execPath, ...args], work, join(work, "runner.log"), env);
  record("playwright-end", { exit: child.exit });
  const final = sourceBytes();
  writeFileSync(join(work, "source-after.json"), JSON.stringify(final, null, 2));
  expect(final, "predicate:runner.whole-tree-restoration").toEqual(initial);
  const elapsedMs = performance.now() - entered;
  record("owner-end", { exit: child.exit, work, elapsedMs });
  if (cases.length === 1) expect(elapsedMs, "predicate:runner.standalone-bound").toBeLessThanOrEqual(30_000);
  if (child.exit !== 0) throw new Error(`campaign failed; retained work: ${work}`);
  return work;
}

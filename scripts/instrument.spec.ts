import { expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { selfArms } from "./arms";
import { changedClass, changedReaders, closeSharedContext, emptyInput, fixtureCampaign, namedRed, observe, ownedChild, record, serve, sourceSnapshots, stagedCases, test, type FixtureDeclaration, type Input } from "./campaign";

async function ownerControl(args: string[], fault?: string) {
  const output = mkdtempSync(join(process.env.CAMPAIGN_OUTPUT ?? tmpdir(), "article-owner-control-"));
  const repo = process.env.CAMPAIGN_REPO!;
  const result = await ownedChild([process.execPath, join(repo, "scripts/instrument.ts"), ...args], repo, join(output, "owner.log"), { ...process.env, CAMPAIGN_OUTPUT: output, CAMPAIGN_FIXTURE_FAULT: fault });
  const log = readFileSync(join(output, "owner.log"), "utf8");
  const lines = log.split("\n").filter(line => line.startsWith("campaign {")).map(line => JSON.parse(line.slice(9)));
  const work = lines.filter(e => e.event === "owner-start").at(-1)?.work as string | undefined;
  const events = work ? readFileSync(join(work, "ledger.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line)) : lines;
  record("owner-control", { args, output, work, exit: result.exit });
  return { result, log, events, work };
}

if (process.env.CAMPAIGN_FIXTURE_CHILD === "1" && process.env.CAMPAIGN_FIXTURE_FAULT === "baseline") test("host/article boundary and decodable self icon @fixture-plain", async ({ browser, browserPid }) => {
  const baseline = stagedCases().find(c => c.input.id === "plain-a")!.input;
  const check = async (mode: Input["mode"], originFault?: Input["originFault"]) => {
    const origin = await serve({ ...baseline, mode, originFault });
    const context = await browser.newContext();
    const id = `origin-control/${mode}/${originFault ?? "baseline"}`;
    record("context", { id, pid: browserPid, origin: origin.origin });
    try {
      for (const path of ["/index.html", "/unknown-root", "/agentic-engineering/favicon.ico"]) {
        const response = await context.request.get(origin.origin + path);
        expect(response.status(), "predicate:runner.origin-boundary").toBe(404);
      }
      const response = await context.request.get(origin.origin + "/favicon.ico");
      expect(response.status(), "predicate:runner.icon-status").toBe(200);
      expect(response.headers()["content-type"], "predicate:runner.icon-type").toBe("image/x-icon");
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      const target = await session.send("Target.getTargetInfo"); await session.detach();
      record("page", { id, pid: browserPid, target: target.targetInfo.targetId });
      await page.goto(origin.url + (mode === "self" ? "hue" : ""));
      const size = await page.evaluate(async () => {
        const icon = new Image(); icon.src = "/favicon.ico";
        try { await icon.decode(); } catch { /* A decoding refusal is measured as zero dimensions. */ }
        return [icon.naturalWidth, icon.naturalHeight];
      });
      expect(size, "predicate:runner.icon-decodes").toEqual([16, 16]);
      expect([...origin.fulfilled], "predicate:runner.host-set").toEqual(["/favicon.ico"]);
      record("origin-control", { mode, size, declared: origin.declared, fulfilled: [...origin.fulfilled] });
    } finally { await context.close(); record("context-close", { id, pid: browserPid }); await origin.close(); }
  };
  for (const mode of ["files", "fallback", "self"] as const) await check(mode);
  await namedRed("runner.origin-boundary", () => check("files", "off-base"));
  await namedRed("runner.origin-boundary", () => check("files", "base-icon"));
  await namedRed("runner.icon-decodes", () => check("self", "self-html-icon"));
});

const fixtureDeclarations: FixtureDeclaration[] = [
  { id: "pure-a", requirement: "pure" },
  { id: "plain-a", requirement: "plain" },
  { id: "plain-b", requirement: "plain" },
  { id: "gpu-a", requirement: "gpu" },
  { id: "fresh-a", requirement: "fresh" },
];
if (process.env.CAMPAIGN_FIXTURE_CHILD === "1") {
  test("independent pure subject @fixture-pure", () => { record("fixture-complete", { id: "pure-a" }); });
  for (const item of stagedCases()) test(`${item.id} @fixture-${item.cohort}`, async ({ browser, browserPid }, info) => {
    const fault = process.env.CAMPAIGN_FIXTURE_FAULT;
    const red = item.id === "plain-b" ? ({ "context-reuse": "runner.context-isolation", "wrong-expectation": "runner.expectation-input", "wrong-origin": "runner.origin-input" } as Record<string, string>)[fault ?? ""] : item.id === "gpu-a" && fault === "merged-cohort" ? "runner.fixture-adapter" : undefined;
    const run = () => observe(browser, browserPid, item, info);
    if (red) await namedRed(red, run); else await run();
    record("fixture-complete", { id: item.id, pid: browserPid, red });
  });
  if (process.env.CAMPAIGN_FIXTURE_FAULT === "baseline") test("compatible same-process context and input faults @fixture-plain", async ({ browser, browserPid }, info) => {
    const a = stagedCases().find(c => c.id === "plain-a")!;
    const b = stagedCases().find(c => c.id === "plain-b")!;
    try {
      process.env.CAMPAIGN_FIXTURE_FAULT = "context-reuse";
      await observe(browser, browserPid, { ...a, id: "probe-context-a" }, info);
      await namedRed("runner.context-isolation", () => observe(browser, browserPid, { ...b, id: "probe-context-b" }, info));
      await closeSharedContext();
      for (const [fault, predicate] of [["wrong-expectation", "runner.expectation-input"], ["wrong-origin", "runner.origin-input"]]) {
        process.env.CAMPAIGN_FIXTURE_FAULT = fault;
        await namedRed(predicate, () => observe(browser, browserPid, { ...b, id: `probe-${fault}` }, info));
      }
    } finally { await closeSharedContext(); process.env.CAMPAIGN_FIXTURE_FAULT = "baseline"; }
  });
  test.afterAll(async () => { await closeSharedContext(); });
}
if (process.env.CAMPAIGN_FIXTURE_CHILD !== "1") for (const fault of ["pure", "baseline", "redundant-launch", "merged-cohort", "fresh-reuse", "dropped-case", "empty-gpu"]) test(`independent actual-runner ${fault} @runner`, async () => {
  test.setTimeout(30_000);
  expect(fixtureDeclarations).toHaveLength(5);
  {
    const declarations = fault === "pure" ? fixtureDeclarations.filter(c => c.requirement === "pure") : fixtureDeclarations;
    const result = await fixtureCampaign(declarations, fault);
    const events = (name: string) => result.events.filter(e => e.event === name);
    const launches = events("launch");
    const closes = events("close");
    expect(closes.map(e => e.pid).sort(), "predicate:runner.fixture-closure").toEqual(launches.map(e => e.pid).sort());
    expect(closes.every(e => e.alive === false), "predicate:runner.fixture-closure").toBe(true);
    if (fault === "empty-gpu") {
      expect(result.log).toContain("predicate:runner.gpu-config");
      await namedRed("runner.gpu-config", async () => {
        expect(Object.keys(events("fixture-configuration")[0].options).length, "predicate:runner.gpu-config").toBeGreaterThan(0);
      });
      expect(launches).toHaveLength(0);
      expect(result.exit).not.toBe(0);
      return;
    }
    expect(result.exit, result.work + "/runner.log").toBe(0);
    const verify = async () => {
      if (fault === "redundant-launch" || fault === "baseline" || fault === "pure") {
        // Derived from fixture declarations, never the selected/staged case list.
        const compatible = new Set(declarations.filter(c => c.requirement !== "pure").map(c => c.requirement));
        expect(launches.length, "predicate:runner.compatible-launches").toBe(compatible.size);
      }
      expect(events("fixture-complete").map(e => e.id).sort(), "predicate:runner.fixture-population").toEqual(declarations.map(c => c.id).sort());
      if (fault === "baseline" || fault === "fresh-reuse") {
        const completed = events("fixture-complete");
        const fresh = completed.find(e => e.id === "fresh-a")!;
        expect(completed.filter(e => e.id !== "fresh-a" && e.pid).every(e => e.pid !== fresh.pid), "predicate:runner.fresh-pid").toBe(true);
        expect(completed.find(e => e.id === "plain-a")!.pid, "predicate:runner.compatible-pid").toBe(completed.find(e => e.id === "plain-b")!.pid);
        const contexts = events("context").filter(e => declarations.some(c => c.id === e.id)), pages = events("page").filter(e => declarations.some(c => c.id === e.id));
        expect(contexts.length, "predicate:runner.fixture-contexts").toBe(4);
        expect(new Set(pages.map(e => e.target)).size, "predicate:runner.fixture-pages").toBe(4);
        expect(new Set(contexts.map(e => e.origin)).size, "predicate:runner.fixture-origins").toBe(4);
      }
    };
    const structuralRed = ({ "redundant-launch": "runner.compatible-launches", "fresh-reuse": "runner.fresh-pid", "dropped-case": "runner.fixture-population" } as Record<string, string>)[fault];
    if (structuralRed) await namedRed(structuralRed, verify); else await verify();
    const inputRed = ({ "context-reuse": "runner.context-isolation", "merged-cohort": "runner.fixture-adapter", "wrong-expectation": "runner.expectation-input", "wrong-origin": "runner.origin-input" } as Record<string, string>)[fault];
    if (inputRed) expect(events("named-red").map(e => e.predicate)).toContain(inputRed);
    if (fault === "baseline") for (const predicate of ["runner.context-isolation", "runner.expectation-input", "runner.origin-input"]) expect(events("named-red").map(e => e.predicate)).toContain(predicate);
    if (fault === "fresh-reuse") expect(events("fixture-marker").filter(e => e.clean)).toHaveLength(4);
    record("fixture-qualified", { fault, work: result.work, launches: launches.length, contexts: events("context").length, pages: events("page").length });
  }
});

const pure = selfArms(emptyInput).filter(arm => arm.pure);
expect(pure).toHaveLength(33); // 32 region controls plus the retained delayed-frame pure control.
for (const arm of pure) {
  test(`${arm.title} @pure`, async ({}, info) => {
    await arm.run(undefined!, info);
    record("executed-pure", { id: `self/${arm.title}`, title: arm.title });
  });
}
test("actual-owner narrow selection and shared-reader union @pure", async () => {
  const run = async (args: string[]) => {
    const work = mkdtempSync(join(process.env.CAMPAIGN_OUTPUT ?? tmpdir(), "article-selection-control-"));
    const repo = process.env.CAMPAIGN_REPO!;
    const result = await ownedChild([process.execPath, join(repo, "scripts/instrument.ts"), ...args], repo, join(work, "owner.log"), { ...process.env, CAMPAIGN_OUTPUT: work, KEX_SIMULATE_NO_DISPLAY: "1" });
    const log = readFileSync(join(work, "owner.log"), "utf8");
    const events = log.split("\n").filter(line => line.startsWith("campaign {")).map(line => JSON.parse(line.slice(9)));
    expect(events.filter(e => ["launch", "build", "fixture-child-start", "playwright-start"].includes(e.event))).toEqual([]);
    return { result, events, log, work };
  };
  const narrow = await run(["--only", "text", "--collect"]);
  expect(narrow.result.exit, narrow.log).toBe(0);
  const narrowCases = narrow.events.find(e => e.event === "collected").cases;
  expect(narrowCases).toHaveLength(3);
  expect(narrowCases.every((id: string) => id.startsWith("text/"))).toBe(true);
  const staged = narrow.events.find(e => e.event === "owner-start").work;
  writeFileSync(join(staged, "figures.spec.ts"), "export {};\n");
  const missing = await ownedChild([process.execPath, join(process.env.CAMPAIGN_REPO!, "node_modules/@playwright/test/cli.js"), "test", "--config", "playwright.config.ts", "--list", "--reporter=json"], staged, join(narrow.work, "missing-body.log"), { ...process.env, CAMPAIGN_SELECTION: JSON.stringify({ only: ["text"], qualify: false }), CAMPAIGN_PENDING: JSON.stringify(narrowCases), KEX_SIMULATE_NO_DISPLAY: "1" });
  expect(missing.exit).not.toBe(0);
  expect(readFileSync(join(narrow.work, "missing-body.log"), "utf8")).toContain("No tests found");
  const scriptReaders = changedReaders(["package.json"], JSON.parse('{"scripts":{"text":"old"}}'), JSON.parse('{"scripts":{"text":"new"}}'));
  const packageScripts = await run(["--only", scriptReaders.join(","), "--collect"]);
  expect(packageScripts.result.exit, packageScripts.log).toBe(0);
  expect(packageScripts.events.find(e => e.event === "collected").cases).toEqual([]);
  expect(packageScripts.events.find(e => e.event === "collected").titles.some((t: string) => t.endsWith("@runner"))).toBe(true);
  const runner = await run(["--only", "runner", "--qualify", "--collect"]);
  expect(runner.result.exit, runner.log).toBe(0);
  const runnerCases: string[] = runner.events.find(e => e.event === "collected").cases;
  expect(runnerCases).toHaveLength(10);
  expect(runnerCases.every(id => id.startsWith("self/"))).toBe(true);
  expect(runner.events.find(e => e.event === "collected").titles.filter((t: string) => t.endsWith("@runner"))).toHaveLength(9);
  const readers = changedReaders(["scripts/region.ts", "scripts/figures.spec.ts"]);
  expect(readers).toEqual(["pure", "figure", "text", "prose", "runtime"]);
  const shared = await run(["--only", readers.join(","), "--collect"]);
  expect(shared.result.exit, shared.log).toBe(0);
  const ids: string[] = shared.events.find(e => e.event === "collected").cases;
  expect(ids.filter(id => id.startsWith("figure/"))).toHaveLength(22);
  expect(ids.filter(id => id.startsWith("text/"))).toHaveLength(3);
  expect(ids.filter(id => id.startsWith("prose/"))).toHaveLength(3);
  expect(ids.filter(id => id.startsWith("runtime/"))).toEqual(["runtime/article/plain/1", "runtime/article/plain/2", "runtime/article/plain/3", "runtime/article/gpu/1"]);
  expect(shared.events.find(e => e.event === "collected").titles.filter((t: string) => t.endsWith("@pure"))).toHaveLength(37);
  for (const args of [[], ["--only", ""], ["--only", "unknown"], ["--only", "text", "--full"], ["--only", "spectrum"], ["--only", "geometry"], ["--only", "text", "--qualify", "--witness", "neutral hierarchy"]]) {
    const refusal = await run(args);
    expect(refusal.result.exit).not.toBe(0);
    expect(refusal.events).toEqual([]);
    expect(refusal.log).not.toContain("no display detected");
  }
});

test("changed subjects classify package keys and assertion consumers @pure", () => {
  expect(changedClass(["scripts/region.ts"])).toBe(3);
  expect(changedClass(["scripts/instrument.ts"])).toBe(2);
  expect(changedClass(["scripts/arms.ts", "scripts/instrument.ts"])).toBe(3);
  expect(changedClass(["package.json"], { scripts: { a: "old" } }, { scripts: { a: "new" } })).toBe(2);
  expect(changedClass(["package.json"], { dependencies: { a: "1" } }, { dependencies: { a: "2" } })).toBe(4);
  expect(changedClass(["src/App.svelte"])).toBe(4);
  expect(changedReaders(["package.json"], { scripts: { a: "old" } }, { scripts: { a: "new" } })).toEqual(["pure", "runner"]);
  expect(changedReaders(["package.json"], { dependencies: { a: "1" } }, { dependencies: { a: "2" } })).toContain("runtime");
});

if (process.env.CAMPAIGN_FIXTURE_CHILD !== "1") test("owned asynchronous cancellation retains incomplete results @runner", async () => {
  const result = await fixtureCampaign([{ id: "plain-a", requirement: "plain" }], "cancel");
  expect(result.exit).not.toBe(0);
  const launches = result.events.filter(e => e.event === "launch");
  expect(launches).toHaveLength(1);
  expect(result.events.filter(e => e.event === "close" && !e.alive).map(e => e.pid)).toEqual(launches.map(e => e.pid));
  expect(result.events.filter(e => e.event === "case-complete" && e.pass)).toEqual([]);
  expect(result.log).toContain("<process did exit: exitCode=0, signal=null>");
  record("cancellation-qualified", { work: result.work, launches: launches.map(e => e.pid), exit: result.exit });
});
if (process.env.CAMPAIGN_FIXTURE_CHILD !== "1") test("actual-owner immutable recovery and missing population @runner", async () => {
  const baseline = await ownerControl(["--only", "text"]);
  expect(baseline.result.exit, baseline.log).toBe(0);
  const completed = baseline.events.filter(e => e.event === "case-complete" && e.pass);
  expect(completed).toHaveLength(3);
  const reused = await ownerControl(["--only", "text", "--resume", baseline.work!]);
  expect(reused.result.exit, reused.log).toBe(0);
  expect(reused.events.filter(e => ["build", "launch", "case-start"].includes(e.event))).toEqual([]);
  expect(reused.events.find(e => e.event === "reused").ids).toHaveLength(3);
  const copy = () => {
    const root = mkdtempSync(join(process.env.CAMPAIGN_OUTPUT ?? tmpdir(), "article-recovery-control-"));
    for (const file of ["cases.json", "source-before.json", "ledger.jsonl"]) cpSync(join(baseline.work!, file), join(root, file));
    return root;
  };
  const missing = copy();
  writeFileSync(join(missing, "ledger.jsonl"), baseline.events.filter(e => !(e.event === "case-complete" && e.id === completed[0].id)).map(e => JSON.stringify(e)).join("\n") + "\n");
  const resumed = await ownerControl(["--only", "text", "--resume", missing]);
  expect(resumed.result.exit, resumed.log).toBe(0);
  expect(resumed.events.filter(e => e.event === "case-start").map(e => e.id)).toEqual([completed[0].id]);
  expect(resumed.events.filter(e => e.event === "build")).toEqual([]);
  const recoveredAgain = await ownerControl(["--only", "text", "--resume", resumed.work!]);
  expect(recoveredAgain.result.exit, recoveredAgain.log).toBe(0);
  expect(recoveredAgain.events.find(e => e.event === "reused").ids).toHaveLength(3);
  expect(recoveredAgain.events.filter(e => ["build", "launch", "case-start"].includes(e.event))).toEqual([]);
  for (const fault of ["hash", "observer", "configuration", "close", "native-close"]) {
    const root = copy();
    const cases = JSON.parse(readFileSync(join(root, "cases.json"), "utf8"));
    if (fault === "hash") cases[0].input.hashes[Object.keys(cases[0].input.hashes)[0]] = "changed";
    writeFileSync(join(root, "cases.json"), JSON.stringify(cases));
    if (fault === "close" || fault === "native-close") writeFileSync(join(root, "ledger.jsonl"), baseline.events.filter(e => e.event !== (fault === "close" ? "close" : "child-close")).map(e => JSON.stringify(e)).join("\n") + "\n");
    const refusal = await ownerControl(["--only", "text", "--resume", root], fault === "observer" || fault === "configuration" ? `changed-${fault}` : undefined);
    expect(refusal.result.exit).not.toBe(0);
    expect(refusal.log).toContain(`predicate:runner.recovery-${fault === "hash" ? "hashes" : fault === "observer" || fault === "configuration" ? "subject" : fault}`);
    expect(refusal.events.filter(e => ["build", "launch", "case-start"].includes(e.event))).toEqual([]);
  }
});

test("whole-source snapshots see path additions, deletions, bytes and enumeration refusal @pure", async () => {
  const owned = mkdtempSync(join(tmpdir(), "article-source-snapshot-"));
  const root = join(owned, "repo");
  const git = (cwd: string, args: string[]) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  };
  try {
    mkdirSync(root);
    git(root, ["init", "--quiet"]);
    writeFileSync(join(root, ".gitignore"), "ignored/\n");
    writeFileSync(join(root, "source.ts"), "export const value = 1;\n");
    writeFileSync(join(root, "untracked.ts"), "export const extra = 1;\n");
    git(root, ["add", "--", "source.ts"]);
    const snapshot = sourceSnapshots(root); // Same factory/binding used by campaign's three reads.
    const initial = snapshot();
    expect(Object.keys(initial)).toEqual([".gitignore", "source.ts", "untracked.ts"]);
    expect(snapshot()).toEqual(initial);
    mkdirSync(join(root, "ignored"));
    writeFileSync(join(root, "ignored", "build.js"), "ignored output");
    expect(snapshot()).toEqual(initial);

    // Reproduce the old carrier with real file reads but its one-time path enumeration.
    const frozenPaths = Object.keys(initial);
    const frozenSnapshot = () => Object.fromEntries(frozenPaths.map(path => [path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")]));
    writeFileSync(join(root, "added.ts"), "export const added = true;\n");
    expect(frozenSnapshot()).toEqual(initial);
    expect(Object.keys(snapshot())).toContain("added.ts");
    await namedRed("runner.source-before-browser", async () => {
      expect(snapshot(), "predicate:runner.source-before-browser").toEqual(initial);
    });
    await namedRed("runner.whole-tree-restoration", async () => {
      expect(snapshot(), "predicate:runner.whole-tree-restoration").toEqual(initial);
    });
    record("source-snapshot-control", { change: "untracked-addition", legacyMissed: true, correctedDetected: true });
    rmSync(join(root, "added.ts"));
    expect(snapshot()).toEqual(initial);

    rmSync(join(root, "untracked.ts"));
    await namedRed("runner.whole-tree-restoration", async () => {
      expect(snapshot(), "predicate:runner.whole-tree-restoration").toEqual(initial);
    });
    writeFileSync(join(root, "untracked.ts"), "export const extra = 1;\n");
    writeFileSync(join(root, "source.ts"), "export const value = 2;\n");
    await namedRed("runner.whole-tree-restoration", async () => {
      expect(snapshot(), "predicate:runner.whole-tree-restoration").toEqual(initial);
    });
    writeFileSync(join(root, "source.ts"), "export const value = 1;\n");
    expect(snapshot()).toEqual(initial);
    rmSync(join(root, "source.ts"));
    expect(() => snapshot()).toThrow(/ENOENT/);
    record("source-snapshot-control", { change: "untracked-deletion, tracked-byte-change, tracked-deletion", detected: true });

    const empty = join(owned, "empty"), notRepo = join(owned, "not-repo");
    mkdirSync(empty); mkdirSync(notRepo);
    git(empty, ["init", "--quiet"]);
    await namedRed("runner.source-population", async () => { sourceSnapshots(empty)(); });
    for (const path of [notRepo, join(owned, "absent")]) {
      await namedRed("runner.source-enumeration", async () => { sourceSnapshots(path)(); });
    }
    record("source-snapshot-control", { change: "empty, non-Git and failed-spawn listings", refused: true });
  } finally {
    rmSync(owned, { recursive: true, force: true });
    record("source-snapshot-cleanup", { owned });
  }
});

test("named-red refuses unrelated exceptions and wrong assertion identities @pure", async () => {
  for (const body of [async () => { throw new Error("predicate:wanted"); }, async () => { expect(1, "predicate:other").toBe(2); }, async () => {}]) {
    let rejected = false;
    try { await namedRed("wanted", body); } catch { rejected = true; }
    expect(rejected).toBe(true);
  }
  await namedRed("wanted", async () => { expect(1, "predicate:wanted").toBe(2); });
});

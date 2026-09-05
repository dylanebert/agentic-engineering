import { expect } from "@playwright/test";
import { selfArms } from "./arms";
import { changedClass, closeSharedContext, emptyInput, fixtureCampaign, namedRed, observe, record, serve, stagedCases, test, type FixtureDeclaration, type Input } from "./campaign";

if (stagedCases().some(c => c.input.id === "baseline")) test("host/article boundary and decodable self icon @plain", async ({ browser, browserPid }) => {
  const baseline = stagedCases().find(c => c.input.id === "baseline")!.input;
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
if (process.env.CAMPAIGN_FIXTURE_CHILD !== "1") test("independent actual-runner population and structural witnesses @runner", async () => {
  expect(fixtureDeclarations).toHaveLength(5);
  for (const fault of ["pure", "baseline", "redundant-launch", "merged-cohort", "fresh-reuse", "dropped-case", "empty-gpu"]) {
    const declarations = fault === "pure" ? fixtureDeclarations.filter(c => c.requirement === "pure") : fixtureDeclarations;
    const result = fixtureCampaign(declarations, fault);
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
      continue;
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
        const contexts = events("context").filter(e => !e.id.startsWith("probe-")), pages = events("page").filter(e => !e.id.startsWith("probe-"));
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
test("changed subjects classify package keys and assertion consumers @pure", () => {
  expect(changedClass(["scripts/region.ts"])).toBe(1);
  expect(changedClass(["scripts/instrument.ts"])).toBe(2);
  expect(changedClass(["scripts/arms.ts", "scripts/instrument.ts"])).toBe(3);
  expect(changedClass(["package.json"], { scripts: { a: "old" } }, { scripts: { a: "new" } })).toBe(2);
  expect(changedClass(["package.json"], { dependencies: { a: "1" } }, { dependencies: { a: "2" } })).toBe(4);
  expect(changedClass(["src/App.svelte"])).toBe(4);
});
test("named-red refuses unrelated exceptions and wrong assertion identities @pure", async () => {
  for (const body of [async () => { throw new Error("predicate:wanted"); }, async () => { expect(1, "predicate:other").toBe(2); }, async () => {}]) {
    let rejected = false;
    try { await namedRed("wanted", body); } catch { rejected = true; }
    expect(rejected).toBe(true);
  }
  await namedRed("wanted", async () => { expect(1, "predicate:wanted").toBe(2); });
});

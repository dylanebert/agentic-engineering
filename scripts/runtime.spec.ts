import { expect } from "@playwright/test";
import { join } from "node:path";
import { test, stagedCases, record, namedRed, type Case } from "./campaign";
import { observeRuntime } from "./runtime";

const cases = stagedCases().filter(item => item.id.startsWith("runtime/"));
// Plain failures are deferred across the whole compatible cohort; GPU witnesses
// assert their named red and complete normally, preserving the worker browser.
const groups: Case[][] = [cases.filter(item => item.cohort === "plain"), ...cases.filter(item => item.cohort === "gpu").map(item => [item])].filter(items => items.length);
for (const items of groups) {
  const cohort = items[0].cohort;
  test(`${cohort === "plain" ? "runtime plain" : items[0].id} @${cohort}`, async ({ browser, browserPid }, info) => {
    const results = [];
    for (const item of items) {
      const outputDir = join(info.outputDir, item.id.replaceAll("/", "-"));
      const outcomes = await test.step(item.id, () => observeRuntime(browser, browserPid, item, { ...info, outputDir }));
      results.push({ item, outcomes, outputDir });
    }
    if (cohort === "plain") {
      for (const input of new Set(items.map(item => item.input.id))) {
        expect(results.filter(r => r.item.input.id === input).length, "predicate:runtime.case-population").toBe(3);
      }
    }
    for (const { item, outcomes, outputDir } of results) {
      record("runtime-case-verdict", { id: item.id, pid: browserPid, pass: outcomes.every(o => o.pass) });
      const assertion = (result: typeof outcomes[number]) => expect(result.pass, `${item.id} predicate:${result.predicate}; evidence ${outputDir}/outcomes.json`).toBe(true);
      if (item.red) {
        const outcome = outcomes.find(o => o.predicate === item.red);
        expect(outcome, "predicate:runtime.witness-population").toBeDefined();
        await namedRed(item.red, async () => assertion(outcome!));
        // Error controls have no unrelated failures; host removal also reds its
        // explicit fixture-byte/status leg. Production mutations stay tracked bad.
        if (item.input.runtimeControl) for (const result of outcomes.filter(o => o.predicate !== item.red && !(item.input.omitHostIcon && o.predicate === "runtime.host-icon"))) assertion(result);
      } else {
        for (const result of outcomes) expect.soft(result.pass, `${item.id} predicate:${result.predicate}; evidence ${outputDir}/outcomes.json`).toBe(true);
      }
    }
  });
}

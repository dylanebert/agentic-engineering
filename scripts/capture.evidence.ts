import { observe, stagedCases, test } from "./campaign";

for (const item of stagedCases().filter(item => item.group === "capture")) {
  test(`${item.id} @${item.cohort}`, async ({ browser, browserPid }, info) => {
    await observe(browser, browserPid, item, info);
  });
}

import { expect } from "@playwright/test";
import { emptyInput, observe, record, resolveArms, stagedCases, test } from "./campaign";
import { figureArms } from "./arms";

for (const item of stagedCases().filter(item => item.group !== "capture" && !item.id.startsWith("runtime/"))) {
  const pure = item.group === "figure" && figureArms(emptyInput).find(arm => arm.title === item.title)?.pure;
  if (pure) {
    test(`${item.id} @${item.cohort}`, async ({}, info) => {
      const arms = await resolveArms(item.input, item.group, "");
      const arm = arms.find(arm => arm.title === item.title);
      expect(arm).toBeDefined();
      await arm!.run(undefined!, info);
      record("executed-pure", { id: item.id, title: item.title });
    });
  } else {
    test(`${item.id} @${item.cohort}`, async ({ browser, browserPid }, info) => {
      await observe(browser, browserPid, item, info);
    });
  }
}

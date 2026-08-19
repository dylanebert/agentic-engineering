import type { Page } from "@playwright/test";

// The variance read every figure stage gates on (oracle 5). Drives a figure across its claimed
// axis and asserts adjacent rendered states are non-identical — catches the three recorded
// failures from taste.md (five color schemes over a near-zero signal, four inert animation
// variants, four byte-identical panels) that all passed every other oracle.
//
// No figures exist yet (they land in D and E). The harness is callable with a figure selector +
// axis driver supplied later; the self-test in instrument.spec.ts proves it works now against a
// synthetic fixture.

export type AxisDriver = (page: Page, step: number) => Promise<void>;

export interface VarianceFailure {
  step: number;
  reason: string;
}

export interface VarianceResult {
  pass: boolean;
  steps: number;
  failures: VarianceFailure[];
}

async function settle(page: Page): Promise<void> {
  // Two rAFs: the first fires the handler, the second confirms it ran. Under reduced-motion the
  // state is already final; under normal motion this lets a transition's first frame land before
  // the screenshot captures it.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
      ),
  );
}

export async function assertVaries(
  page: Page,
  selector: string,
  driver: AxisDriver,
  steps: number,
): Promise<VarianceResult> {
  const failures: VarianceFailure[] = [];
  const screenshots: Buffer[] = [];

  for (let step = 0; step < steps; step++) {
    await driver(page, step);
    const el = page.locator(selector);
    await el.waitFor({ state: "visible" });
    await settle(page);
    screenshots.push(await el.screenshot());
  }

  for (let i = 1; i < screenshots.length; i++) {
    if (screenshots[i].equals(screenshots[i - 1])) {
      failures.push({
        step: i,
        reason: `state ${i} is byte-identical to state ${i - 1}`,
      });
    }
  }

  return { pass: failures.length === 0, steps, failures };
}

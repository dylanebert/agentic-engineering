import type { Page } from "@playwright/test";

// The reduced-motion read (oracle 6). Forces `prefers-reduced-motion: reduce` and reads the
// render's whole state set — every axis position, not one frame — asserting each state is fully
// drawn (stable, no pending transition). A figure that renders one frame fine but leaves another
// state mid-transition has the bug this exists to catch (ui.md: a status view that can render
// "unknown" as "fine" has the bug it exists to catch — the check is over the render's whole state
// set, not one frame).
//
// Like variance.ts, no figures exist yet; the self-test in instrument.spec.ts proves it works now.

export type StateReader = (
  page: Page,
  step: number,
) => Promise<Record<string, string>>;

export interface ReducedMotionFailure {
  step: number;
  reason: string;
}

export interface ReducedMotionResult {
  pass: boolean;
  steps: number;
  failures: ReducedMotionFailure[];
}

// Reads a comprehensive state fingerprint: the computed values most likely to carry a transition.
// Two reads separated by a rAF must agree — if they differ, a transition is still in flight and
// the state is not fully drawn.
async function readState(page: Page, selector: string): Promise<Record<string, string>> {
  return page.locator(selector).evaluate((el) => {
    const cs = getComputedStyle(el);
    const keys = [
      "background-color",
      "color",
      "opacity",
      "transform",
      "width",
      "height",
      "border-color",
      "box-shadow",
      "clip-path",
    ];
    const state: Record<string, string> = {};
    for (const k of keys) state[k] = cs.getPropertyValue(k);
    // Custom properties carry the axis value — include them so a figure driven through a CSS
    // variable has its claimed axis in the state set.
    for (const decl of el.style) state[`--${decl}`] = el.style.getPropertyValue(decl);
    return state;
  });
}

function statesEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export async function assertReducedMotion(
  page: Page,
  selector: string,
  driver: (page: Page, step: number) => Promise<void>,
  steps: number,
): Promise<ReducedMotionResult> {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const failures: ReducedMotionFailure[] = [];

  for (let step = 0; step < steps; step++) {
    await driver(page, step);
    const el = page.locator(selector);
    await el.waitFor({ state: "visible" });
    // One rAF to let the browser apply the step.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null))),
    );
    const first = await readState(page, selector);
    // A second read after another rAF — if the state changed, a transition is in flight.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null))),
    );
    const second = await readState(page, selector);
    if (!statesEqual(first, second)) {
      failures.push({
        step,
        reason: `state ${step} is not stable across frames — a transition is in flight under reduced-motion`,
      });
    }
  }

  return { pass: failures.length === 0, steps, failures };
}

import type { Page } from "@playwright/test";
import type { AxisDriver } from "./variance";

// The reduced-motion read (oracle 6). Forces `prefers-reduced-motion: reduce` and reads the
// render's whole state set — every axis position, not one frame — asserting each state is fully
// drawn (stable, no pending transition) and non-trivial (actually drew something). A figure that
// renders one frame fine but leaves another state mid-transition, or that never draws at all,
// has the bug this exists to catch (ui.md: a status view that can render "unknown" as "fine" has
// the bug it exists to catch — the check is over the render's whole state set, not one frame).
//
// Like variance.ts, all four figures now exist; the self-test in instrument.spec.ts proved it
// works, and figures.spec.ts drives it against the real page.

export interface ReducedMotionFailure {
  step: number;
  reason: string;
}

export interface ReducedMotionResult {
  pass: boolean;
  steps: number;
  failures: ReducedMotionFailure[];
}

// Fix 4: the old computed-style read could not tell "fully drawn" from "never drew" (a
// visible-but-blank element has stable computed styles → green), and it read only the selector
// element, not descendants, so a child stuck mid-transition passed. This read widens to the
// subtree two ways:
//   - stability: two `el.screenshot()` frames separated by a rAF must be byte-identical. A
//     screenshot captures the whole subtree (matching the variance read's scope), so a child
//     still mid-transition makes the frames differ → red. Byte-identity is the right test for
//     frame stability: consecutive frames must be pixel-identical, not merely perceptually
//     similar.
//   - non-triviality: the subtree must have actually drawn something — a non-transparent
//     background, text, or an image/canvas/svg/video — anywhere in the subtree. A screenshot
//     cannot tell "never drew" from "fully drew" (a transparent element shows the page
//     background as opaque), so this is a DOM/computed-style read, not a pixel read.

async function isNonTrivial(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((el) => {
    const isOpaqueBg = (bg: string): boolean => {
      if (!bg || bg === "transparent") return false;
      const m = bg.match(/rgba?\(([^)]+)\)/);
      if (!m) return false;
      const parts = m[1].split(",").map((s) => s.trim());
      if (parts.length === 4 && parseFloat(parts[3]) === 0) return false;
      return true;
    };
    const all = [el, ...el.querySelectorAll("*")];
    for (const n of all) {
      const cs = getComputedStyle(n);
      if (isOpaqueBg(cs.backgroundColor) || isOpaqueBg(cs.background)) return true;
      // tagName is lowercase for inline SVG (an XML element) but uppercase for HTML, so
      // normalize to catch svg-only figures that would otherwise be flagged trivial.
      const tag = n.tagName.toUpperCase();
      if (tag === "IMG" && (n as HTMLImageElement).currentSrc) return true;
      if (tag === "CANVAS" || tag === "SVG" || tag === "VIDEO") return true;
    }
    const text = el.textContent;
    if (text && text.trim().length > 0) return true;
    return false;
  });
}

export async function assertReducedMotion(
  page: Page,
  selector: string,
  driver: AxisDriver,
  steps: number,
): Promise<ReducedMotionResult> {
  // Fix 3: zero states means the loop never runs and the check returns green for nothing.
  if (steps < 1) {
    throw new Error(`assertReducedMotion needs ≥1 state, got ${steps}`);
  }
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
    const first = await el.screenshot();
    // A second screenshot after another rAF — if it differs, a transition is still in flight.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null))),
    );
    const second = await el.screenshot();
    if (!first.equals(second)) {
      failures.push({
        step,
        reason: `state ${step} is not stable across frames — a transition is in flight under reduced-motion`,
      });
      continue;
    }
    const nonTrivial = await isNonTrivial(page, selector);
    if (!nonTrivial) {
      failures.push({
        step,
        reason: `state ${step} resting state is trivial — element is blank / never drew (no opaque background, text, or image in the subtree)`,
      });
    }
  }

  return { pass: failures.length === 0, steps, failures };
}

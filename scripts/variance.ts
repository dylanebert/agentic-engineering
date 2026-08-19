import type { Page } from "@playwright/test";
import { perceptualDelta } from "./png";

// The variance read every figure stage gates on (oracle 5). Drives a figure across its claimed
// axis and asserts adjacent rendered states are perceptually non-identical — catches the three
// recorded failures from taste.md (five color schemes over a near-zero signal, four inert
// animation variants, four byte-identical panels) that all passed every other oracle.
//
// No figures exist yet (they land in D and E). The harness is callable with a figure selector +
// axis driver supplied later; the self-test in instrument.spec.ts proves it works now against
// synthetic fixtures.

export type AxisDriver = (page: Page, step: number) => Promise<void>;

export interface VarianceFailure {
  step: number;
  reason: string;
  meanDelta: number;
  maxDelta: number;
  extent: number;
}

export interface VarianceResult {
  pass: boolean;
  steps: number;
  failures: VarianceFailure[];
}

// Perceptual floors (fix 1). The old check used Buffer.equals — byte-identity — so a figure
// varying sub-perceptually (different bytes, visually indistinguishable) passed. We now decode
// the PNGs and require adjacent states to exceed a perceptual delta floor, reporting both a
// magnitude (mean/max per-pixel RGB delta) and a spatial extent (fraction of pixels above the
// JND). The thresholds are grounded in just-noticeable-difference, not tuned to any fixture:
//
//   JND          — a pixel counts as "noticeably different" when its max-channel RGB delta
//                  exceeds 3 levels. The JND for 8-bit sRGB is ~1-3 levels/channel under typical
//                  viewing; 3 is the conservative end (see png.ts).
//   MEAN_FLOOR   — the mean per-pixel max-channel delta must exceed 1 level. A sub-perceptual
//                  global tint (e.g. 1-RGB-unit steps) sits at/below this.
//   EXTENT_FLOOR — at least 1% of pixels must clear the JND, so a sub-perceptual change spread
//                  across the whole figure reds even if a few pixels happen to round up.
//
// A state pair reds when EITHER floor is missed — it must differ both in magnitude and in
// spatial extent to count as "varies".
const JND = 3;
const MEAN_FLOOR = 1;
const EXTENT_FLOOR = 0.01;

async function settle(page: Page): Promise<void> {
  // Two rAFs: the first fires the handler, the second confirms it ran. We force
  // prefers-reduced-motion: reduce (in assertVaries) so CSS transitions are suppressed and every
  // driven state is already final when the screenshot is taken — the 2 rAFs only let the frame
  // land, they do not race a 0.3s transition. (Fix 5: a 2-rAF settle (~32ms) against a 0.3s
  // transition used to capture mid-transition frames, so a figure converging to one final state
  // via different paths showed different frames and greened a void final state.)
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
  // Fix 3: fewer than 2 states means the comparison loop never runs and the check returns green
  // for nothing. A driver asked for fewer states than this is an error, not a pass.
  if (steps < 2) {
    throw new Error(`assertVaries needs ≥2 states to compare, got ${steps}`);
  }
  // Fix 5: force reduced-motion so each driven state is final, not mid-transition.
  await page.emulateMedia({ reducedMotion: "reduce" });

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
    const { meanDelta, maxDelta, extent } = perceptualDelta(
      screenshots[i - 1],
      screenshots[i],
    );
    if (meanDelta <= MEAN_FLOOR || extent <= EXTENT_FLOOR) {
      failures.push({
        step: i,
        reason: `state ${i} is perceptually indistinguishable from state ${i - 1} (meanDelta ${meanDelta.toFixed(3)} ≤ ${MEAN_FLOOR}, extent ${extent.toFixed(4)} ≤ ${EXTENT_FLOOR})`,
        meanDelta,
        maxDelta,
        extent,
      });
    }
  }

  return { pass: failures.length === 0, steps, failures };
}

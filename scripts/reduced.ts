import type { Page } from "@playwright/test";
import type { AxisDriver } from "./variance";

// The reduced-motion read (oracle 6). Forces `prefers-reduced-motion: reduce` and reads the
// render's whole state set — every axis position, not one frame — asserting each state is fully
// drawn (stable, no pending transition) and non-trivial (actually drew something). A figure that
// renders one frame fine but leaves another state mid-transition, or that never draws at all,
// has the bug this exists to catch (ui.md: a status view that can render "unknown" as "fine" has
// the bug it exists to catch — the check is over the render's whole state set, not one frame).
//
// figures.spec.ts drives it against the real page.

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

// The recorded state-0 red came from comparing the first post-load raster with the next frame.
// Discard one frame before establishing the candidate and require two stable pairs: one equal
// stale pair can no longer be accepted as rest, while a real transition still exhausts the bound.
export const REST_BUDGET = 12;

async function nextFrame(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
  );
}

export async function settleToRest(
  page: Page,
  selector: string,
  budget: number = REST_BUDGET,
): Promise<void> {
  const el = page.locator(selector);
  await nextFrame(page);
  let previous = await el.screenshot();
  let stablePairs = 0;
  for (let i = 0; i < budget; i++) {
    await nextFrame(page);
    const next = await el.screenshot();
    if (previous.equals(next)) {
      stablePairs++;
      if (stablePairs === 2) return;
    } else {
      stablePairs = 0;
    }
    previous = next;
  }
  throw new Error(
    `never reached rest within ${budget} rAF-separated frame pairs — a transition or animation is in flight under reduced-motion`,
  );
}

async function activeMotion(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((el) =>
    el.getAnimations({ subtree: true }).filter((animation) => {
      if (animation.playState !== "running") return false;
      const duration = Number(animation.effect?.getComputedTiming().activeDuration ?? 0);
      // The page's reduced-motion contract clamps transitions to 0.01ms, below a rendered
      // frame. Longer finite motion and infinite motion are observable violations.
      return !Number.isFinite(duration) || duration > 0.01;
    }).length,
  );
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
    const moving = await activeMotion(page, selector);
    if (moving > 0) {
      failures.push({
        step,
        reason: `state ${step} has ${moving} active animation(s) under reduced-motion`,
      });
      continue;
    }
    try {
      await settleToRest(page, selector);
    } catch (err) {
      failures.push({
        step,
        reason: `state ${step} is not stable across frames — ${(err as Error).message}`,
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

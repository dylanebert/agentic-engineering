import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, type Page } from "@playwright/test";
import REAL_GPU_LAUNCH from "@dylanebert/shallot/harness/browser" with { type: "json" };
import { bytes, closeBrowser, launch, serve } from "./campaign";
import { perceptualDelta } from "./png";
import { requireDisplay } from "./display";

const root = resolve(import.meta.dir, "..");
const output = mkdtempSync(join(tmpdir(), "article-hero-startup-"));
const update = process.argv.includes("--update-poster");
const only = process.argv.slice(2).find(arg => !arg.startsWith("--"));
const hero = '[data-hero-id="spectrum-hero"]';
const poster = `${hero} [data-hero-poster]`;

async function read(page: Page) {
  return page.locator(hero).evaluate(h => ({
    phase: Number(getComputedStyle(h).getPropertyValue("--phase")),
    gpu: (h as HTMLElement).dataset.heroGpu,
    poster: getComputedStyle(h.querySelector("img")!).visibility,
    canvas: getComputedStyle(h.querySelector("canvas")!).opacity,
    box: h.querySelector(".canvas-wrap")!.getBoundingClientRect().toJSON(),
  }));
}

async function rawFrame(page: Page) {
  const frame = await page.evaluate(async () => {
    const capture = (globalThis as typeof globalThis & { __heroCapture?: () => Promise<{ rgba: Uint8ClampedArray; width: number; height: number }> }).__heroCapture;
    if (!capture) throw new Error("public Shallot capture is not installed");
    const result = await capture();
    const light = result.rgba.filter((value, index) => index % 4 === 0 && value > 0).length;
    return { width: result.width, height: result.height, light };
  });
  expect([frame.width, frame.height], "public fixed capture geometry").toEqual([1280, 720]);
  expect(frame.light, "real glyphs, not a cleared swapchain").toBeGreaterThan(0);
  return frame;
}

async function main() {
  if (!requireDisplay("hero-startup")) return;
  const build = Bun.spawnSync(["bun", "run", "build"], { cwd: root, stdout: "pipe", stderr: "pipe" });
  writeFileSync(join(output, "build.log"), build.stdout.toString() + build.stderr.toString());
  if (build.exitCode) throw new Error(`build failed: ${output}/build.log`);
  cpSync(join(root, "dist"), join(output, "dist"), { recursive: true });
  const input = { id: "hero-startup", root: output, mode: "files" as const, hashes: bytes(output) };
  const origin = await serve(input);
  let handle: Awaited<ReturnType<typeof launch>> | undefined;
  const results: unknown[] = [];
  try {
    handle = await launch(REAL_GPU_LAUNCH, "gpu");
    const cases = update ? [{ name: "capture", width: 1440, dpr: 2, mode: "reduce" }] : [
      { name: "desktop", width: 1440, dpr: 1, mode: "reduce" },
      { name: "retina", width: 1440, dpr: 2, mode: "reduce" },
      { name: "mobile", width: 390, dpr: 2, mode: "reduce" },
      { name: "delayed", width: 1440, dpr: 1, mode: "delayed" },
      { name: "playback", width: 1440, dpr: 1, mode: "playback" },
      { name: "no-webgpu", width: 390, dpr: 2, mode: "missing" },
      { name: "no-adapter", width: 390, dpr: 1, mode: "absent" },
      { name: "failed-init", width: 1440, dpr: 2, mode: "failed" },
    ].filter(item => only === undefined || item.name === only);
    if (cases.length === 0) throw new Error(`no case named ${only}`);
    for (const item of cases) {
      const context = await handle.browser.newContext({ viewport: { width: item.width, height: 900 }, deviceScaleFactor: item.dpr, reducedMotion: item.mode === "reduce" ? "reduce" : "no-preference", ...(item.mode === "playback" ? { recordVideo: { dir: output, size: { width: 1440, height: 900 } } } : {}) });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
        await page.route("**/*", route => route.request().url().startsWith(origin.origin) ? route.continue() : route.fulfill({ status: 200, body: "", headers: { "access-control-allow-origin": "*" } }));
        if (item.mode === "missing") await page.addInitScript(() => { Reflect.deleteProperty(Navigator.prototype, "gpu"); });
        if (item.mode === "absent" || item.mode === "failed") await page.addInitScript(mode => {
          navigator.gpu.requestAdapter = async () => { if (mode === "failed") throw new Error("deliberate initialization failure"); return null; };
        }, item.mode);
        if (item.mode === "delayed") await page.addInitScript(() => {
          const w = window as any;
          w.__startup = { samples: [], submissions: 0 };
          const barrier = new Promise<void>(resolve => { w.__releaseStartup = resolve; });
          const done = GPUQueue.prototype.onSubmittedWorkDone;
          GPUQueue.prototype.onSubmittedWorkDone = async function () { await done.call(this); w.__startup.submissions++; await barrier; };
          const sample = (time: number) => {
            const h = document.querySelector('[data-hero-id="spectrum-hero"]') as HTMLElement | null;
            if (h && w.__startup.samples.length < 600) w.__startup.samples.push({ time, phase: Number(getComputedStyle(h).getPropertyValue("--phase")), gpu: h.dataset.heroGpu, poster: getComputedStyle(h.querySelector("img")!).visibility });
            requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
        await page.goto(origin.url);
        await page.locator(poster).evaluate((img: HTMLImageElement) => img.decode());
        if (item.mode === "playback") {
          await expect(page.locator(hero)).toHaveAttribute("data-hero-gpu", "drawn", { timeout: 30000 });
          await page.waitForFunction(selector => Number(getComputedStyle(document.querySelector(selector)!).getPropertyValue("--phase")) > 0.2, hero);
          const state = await read(page);
          const box = await page.locator(hero).boundingBox();
          const video = page.video()!;
          await page.close();
          await video.saveAs(join(output, "startup.webm"));
          results.push({ ...item, state, box, video: "startup.webm" });
        } else if (item.mode === "absent" || item.mode === "failed" || item.mode === "missing") {
          if (item.mode === "absent" || item.mode === "failed") await expect(page.locator(hero)).toHaveAttribute("data-hero-gpu", "unsupported");
          const first = await read(page);
          const image = await page.locator(`${hero} .canvas-wrap`).screenshot();
          await page.waitForTimeout(300);
          expect(await read(page)).toEqual(first);
          expect(first.phase).toBe(0);
          expect(first.poster).toBe("visible");
          expect(first.canvas).toBe("0");
          expect(perceptualDelta(image, await page.locator(`${hero} .canvas-wrap`).screenshot()).maxDelta).toBe(0);
          results.push({ ...item, stable: true });
        } else if (item.mode === "delayed") {
          await page.waitForFunction(() => (window as any).__startup.submissions > 0);
          const waiting = await read(page);
          expect(waiting.gpu).not.toBe("drawn");
          expect(waiting.phase).toBe(0);
          expect(waiting.poster).toBe("visible");
          expect(waiting.canvas).toBe("0");
          expect(await rawFrame(page), "normal-motion first frame uses the public capture").toMatchObject({ width: 1280, height: 720 });
          const still = await page.locator(`${hero} .canvas-wrap`).screenshot({ path: join(output, "waiting.png") });
          await page.waitForTimeout(250);
          expect(await read(page)).toEqual(waiting);
          await page.evaluate(() => (window as any).__releaseStartup());
          await expect(page.locator(hero)).toHaveAttribute("data-hero-gpu", "drawn");
          await page.waitForFunction(selector => Number(getComputedStyle(document.querySelector(selector)!).getPropertyValue("--phase")) > 0.02, hero);
          const started = await read(page);
          expect(started.poster).toBe("hidden");
          expect(started.box).toEqual(waiting.box);
          const moving = await page.locator(`${hero} .canvas-wrap`).screenshot({ path: join(output, "moving.png") });
          expect(perceptualDelta(still, moving).maxDelta).toBeGreaterThan(3);
          const samples = await page.evaluate(() => (window as any).__startup.samples as { time: number; phase: number; gpu?: string; poster: string }[]);
          const ready = samples.find(s => s.gpu === "drawn")!;
          const motion = samples.find(s => s.phase > 0)!;
          expect(ready).toBeDefined(); expect(motion).toBeDefined();
          expect(samples.filter(s => s.gpu !== "drawn").every(s => s.phase === 0 && s.poster === "visible")).toBe(true);
          expect(motion.time - ready.time, "hold the matching pose through the 200ms dissolve").toBeGreaterThanOrEqual(190);
          await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(100);
          const paused = (await read(page)).phase;
          await page.waitForTimeout(200);
          expect((await read(page)).phase).toBe(paused);
          await page.evaluate(() => scrollTo(0, 0));
          await page.waitForFunction(({ selector, phase }) => Number(getComputedStyle(document.querySelector(selector)!).getPropertyValue("--phase")) !== phase, { selector: hero, phase: paused });
          results.push({ ...item, waiting, started, ready, motion });
        } else {
          await expect(page.locator(hero)).toHaveAttribute("data-hero-gpu", "drawn", { timeout: 30000 });
          const frame = await rawFrame(page);
          if (update) {
            console.log(`Public Shallot capture geometry: ${frame.width}x${frame.height}`);
          } else {
            const wrap = page.locator(`${hero} .canvas-wrap`);
            await wrap.screenshot({ path: join(output, `${item.name}-live.png`) });
            // Poster and WebGPU are intentionally separate presentation paths. The live verdict is
            // the public final-canvas capture above; the subtree screenshot remains diagnostic only.
            results.push({ ...item, capture: { width: frame.width, height: frame.height, light: frame.light }, diagnostic: "subtree screenshot" });
          }
        }
        expect(errors, `${item.name}: browser errors`).toEqual([]);
      } finally { await context.close(); }
    }
  } finally {
    try { if (handle) await closeBrowser(handle); } finally { await origin.close(); }
    writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2));
    console.log(`Startup evidence: ${output}`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

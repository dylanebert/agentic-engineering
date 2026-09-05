import { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, type Browser, type TestInfo } from "@playwright/test";
import { bytes, campaign, hostIcon, record, serve, types, type Case, type Input } from "./campaign";
import { decodePng, type DecodedPng } from "./png";
import { classifyRegion, type Region } from "./region";

const base = "/agentic-engineering/";
const external = [
  "https://www.datadoghq-browser-agent.com/us1/v6/datadog-rum.js",
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=Inter:wght@400;700&family=JetBrains+Mono:wght@400&family=Outfit:wght@500;600&display=swap",
];
const hero = '[data-hero-id="spectrum-hero"]';
const treatments = ["agentic", "vibe", "human"];

/** Control uses real WebGPU APIs; instrumentation never manufactures acquisitions. */
function healthy(error: boolean) {
  return `<!doctype html><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="${external[1].replaceAll("&", "&amp;")}"><script async crossorigin="anonymous" src="${external[0]}"></script>
<style>body{margin:0;background:rgb(251,252,253)}[data-hero-id]{margin:40px;width:500px;height:320px}canvas,pre{position:absolute;top:100px;width:500px;height:220px}pre{color:#673baa}main{height:2000px}</style>
<div data-hero-id="spectrum-hero" data-hero-state="agentic" style="--phase:0"><pre>Captured unchanged agentic rest\n[] [] [] []\n[] [] [] []</pre><canvas width="500" height="220"></canvas></div><main>Runtime synthetic control. Not article evidence.</main>
<script type="module">
const h=document.querySelector('[data-hero-id]'),c=h.querySelector('canvas'),pre=h.querySelector('pre');
let phase=0,last=0,elapsed=0,active=false,raf=0;
const adapter=await navigator.gpu?.requestAdapter();
if(adapter){
const device=await adapter.requestDevice(),context=c.getContext('webgpu'),format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
const module=device.createShaderModule({code:\`struct U{phase:f32,kind:f32,pad:vec2f};@group(0) @binding(0) var<uniform> u:U;
@vertex fn v(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
@fragment fn f(@builtin(position) p:vec4f)->@location(0) vec4f{let q=p.xy-vec2f(250,110);let a=u.phase*6.2831853;let r=vec2f(q.x*cos(a)-q.y*sin(a),q.x*sin(a)+q.y*cos(a));var bg=vec3f(251.0/255.0,252.0/255.0,253.0/255.0);if(u.kind==0){bg=vec3f(0.025);}
if(abs(r.x)<45 && abs(r.y)<45){var col=vec3f(0.35,0.15,0.65);if(u.kind==1){col=vec3f(0.65,0.12,0.8);}if(u.kind==2){col=vec3f(0.15,0.35,0.25);}return vec4f(col,1);}return vec4f(bg,1);}\`});
const pipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'v'},fragment:{module,entryPoint:'f',targets:[{format}]},primitive:{topology:'triangle-list'}});
const buffer=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
function tick(t){if(!active)return;if(last)elapsed+=t-last;last=t;phase=(elapsed%12000)/12000;
const s=Math.sin(phase*Math.PI*2),kind=s>0.5?1:s< -0.5?2:0,state=['agentic','vibe','human'][kind];h.style.setProperty('--phase',String(phase));h.dataset.heroState=state;h.dataset.heroTreatment=state;if(kind===0)h.dataset.heroCells='40x14';else delete h.dataset.heroCells;
device.queue.writeBuffer(buffer,0,new Float32Array([phase,kind,0,0]));const e=device.createCommandEncoder();const p=e.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[1,1,1,1]}]});p.setPipeline(pipeline);p.setBindGroup(0,group);p.draw(3);p.end();device.queue.submit([e.finish()]);h.dataset.heroGpu='drawn';pre.style.visibility='hidden';raf=requestAnimationFrame(tick);}
new IntersectionObserver(([e])=>{active=e.isIntersecting;cancelAnimationFrame(raf);last=0;if(active)raf=requestAnimationFrame(tick);},{threshold:0.2}).observe(h);
}else{c.style.visibility='hidden';}
${error ? "setTimeout(()=>{console.error('runtime forced console error');throw new Error('runtime forced thrown error');},1500);" : ""}
</script>`;
}

export function stageRuntime(baseline: Input, cases: Case[], control = process.env.RUNTIME_CONTROL ?? "article", witness = false) {
  if (!["article", "healthy", "error"].includes(control)) throw new Error("unknown runtime control");
  let input = baseline;
  if (control !== "article") {
    const root = join(baseline.root, "..", control);
    cpSync(baseline.root, root, { recursive: true });
    writeFileSync(join(root, "dist/index.html"), healthy(control === "error"));
    input = { ...baseline, id: control, root, runtimeControl: control as "healthy" | "error", hashes: bytes(root) };
  }
  for (const cohort of ["plain", "gpu"] as const) for (let n = 1; n <= (cohort === "plain" ? 3 : 1); n++) {
    cases.push({ id: `runtime/${control}/${cohort}/${n}`, title: "sustained runtime", group: "figure", cohort, input, red: witness && control === "error" ? "runtime.zero-errors" : undefined });
  }
}

/** Runs before navigation and wraps native calls without replacing their results. */
function instrument() {
  const w = window as any;
  const s = w.__runtime = { adapters: 0, successfulAdapters: 0, devices: 0, successfulDevices: 0, contextCalls: 0, contexts: 0, canvases: 0, events: [] as any[], timeline: [] as any[] };
  const emit = (kind: string, data: unknown) => s.events.push({ t: performance.now(), kind, data });
  const contexts = new WeakSet<object>(), canvases = new WeakSet<object>();
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: any[]) {
    const result = (get as any).apply(this, args);
    if (args[0] === "webgpu") { s.contextCalls++; if (result && !contexts.has(result)) { contexts.add(result); s.contexts++; } emit("context", { success: Boolean(result) }); }
    return result;
  } as typeof get;
  if (navigator.gpu) {
    const request = navigator.gpu.requestAdapter;
    navigator.gpu.requestAdapter = function (...args: any[]) {
      s.adapters++; emit("adapter-request", {});
      const result = (request as any).apply(this, args);
      result.then((adapter: any) => { if (adapter) s.successfulAdapters++; emit("adapter-result", { success: Boolean(adapter), info: adapter ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device, description: adapter.info.description } : null }); }, (error: unknown) => emit("adapter-rejected", String(error)));
      return result;
    };
  }
  if (typeof GPUAdapter !== "undefined") {
    const request = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = function (...args: any[]) {
      s.devices++; emit("device-request", {});
      const result = (request as any).apply(this, args);
      result.then((device: GPUDevice) => { s.successfulDevices++; emit("device-result", {}); device.addEventListener("uncapturederror", (e: any) => emit("gpu-error", e.error.message)); device.lost.then(v => emit("device-lost", v)); }, (error: unknown) => emit("device-rejected", String(error)));
      return result;
    };
  }
  function tick(t: number) {
    const h = document.querySelector('[data-hero-id]') as HTMLElement | null;
    if (h) {
      for (const c of h.querySelectorAll('canvas')) if (!canvases.has(c)) { canvases.add(c); s.canvases++; }
      s.timeline.push({ t, phase: Number(getComputedStyle(h).getPropertyValue('--phase')), state: h.dataset.heroState, treatment: h.dataset.heroTreatment });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
async function snapshot(page: Page) {
  return page.locator(hero).evaluate(h => {
    const s = (window as any).__runtime, c = h.querySelector('canvas')!;
    const rgb = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    return { t: performance.now(), phase: Number(getComputedStyle(h).getPropertyValue('--phase')), state: h.getAttribute('data-hero-state'), treatment: h.getAttribute('data-hero-treatment'), cells: h.getAttribute('data-hero-cells'), drawn: h.getAttribute('data-hero-gpu'), box: c.getBoundingClientRect().toJSON(), page: rgb, canvasCount: document.querySelectorAll('canvas').length, counters: { adapters: s.adapters, successfulAdapters: s.successfulAdapters, devices: s.devices, successfulDevices: s.successfulDevices, contextCalls: s.contextCalls, contexts: s.contexts, canvases: s.canvases } };
  });
}
type Read = Awaited<ReturnType<typeof snapshot>>;
type Frame = { before: Read; after: Read; region: Region; image: DecodedPng; file: string };
function localDelta(a: Frame, b: Frame) {
  if (!a.region.pass || !b.region.pass || a.image.width !== b.image.width || a.image.height !== b.image.height) return null;
  const x0 = Math.min(a.region.bounds!.x, b.region.bounds!.x), y0 = Math.min(a.region.bounds!.y, b.region.bounds!.y);
  const x1 = Math.max(a.region.bounds!.x + a.region.bounds!.width, b.region.bounds!.x + b.region.bounds!.width), y1 = Math.max(a.region.bounds!.y + a.region.bounds!.height, b.region.bounds!.y + b.region.bounds!.height);
  let sum = 0, above = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * a.image.width + x) * 4;
    const d = Math.max(...[0, 1, 2].map(c => Math.abs(a.image.data[i+c] - b.image.data[i+c])));
    sum += d; if (d > 3) above++; n++;
  }
  return { mean: sum / n, extent: above / n, pixels: n };
}

export async function observeRuntime(browser: Browser, pid: number, item: Case, info: TestInfo) {
  const origin = await serve(item.input);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: "no-preference", serviceWorkers: "block" });
  record("context", { id: item.id, pid, origin: origin.origin });
  mkdirSync(info.outputDir, { recursive: true });
  const rawFile = join(info.outputDir, "raw.jsonl");
  const raw = (kind: string, data: unknown) => appendFileSync(rawFile, JSON.stringify({ at: new Date().toISOString(), kind, data }) + "\n");
  const outcomes: { predicate: string; pass: boolean; evidence: unknown }[] = [];
  const check = (predicate: string, pass: boolean, evidence: unknown) => { outcomes.push({ predicate, pass, evidence }); raw("assertion", outcomes.at(-1)); };
  const errors: { kind: string; text: string }[] = [], fulfilled = new Set<string>(), rejected: string[] = [];
  const control = Boolean(item.input.runtimeControl);
  const distPaths = Object.keys(bytes(join(item.input.root, "dist")));
  const articlePaths = control ? ["index.html"] : distPaths.filter(p => p !== "__case.json" && (item.cohort === "gpu" || !p.startsWith("fonts/") && !p.startsWith("assets/hero-engine-")));
  const declared = [...articlePaths.map(p => origin.origin + base + (p === "index.html" ? "" : p)), origin.origin + "/favicon.ico", ...external].sort();
  try {
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    const target = await session.send("Target.getTargetInfo");
    // Playwright's route layer unconditionally aborts */favicon.ico before
    // user handlers. CDP fulfilment observes that exact URL without a rename.
    session.on("Fetch.requestPaused", async event => {
      const url = event.request.url;
      raw("request", { url, method: event.request.method, headers: event.request.headers });
      try {
        if (!declared.includes(url)) {
          rejected.push(url); raw("rejected-request", url);
          await session.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "BlockedByClient" }); return;
        }
        let body: Buffer, contentType: string, responseCode = 200;
        if (external.includes(url)) {
          body = Buffer.alloc(0); contentType = url === external[0] ? "text/javascript" : "text/css";
        } else if (url === origin.origin + "/favicon.ico") {
          body = item.input.omitHostIcon ? Buffer.from("missing host icon") : hostIcon;
          contentType = "image/x-icon"; responseCode = item.input.omitHostIcon ? 404 : 200;
        } else {
          const path = new URL(url).pathname.slice(base.length) || "index.html";
          body = readFileSync(join(item.input.root, "dist", path));
          contentType = types[path.split('.').at(-1)!] ?? "application/octet-stream";
        }
        const responseHeaders = [{ name: "Content-Type", value: contentType }];
        if (external.includes(url) && !item.input.omitRuntimeCors) responseHeaders.push({ name: "Access-Control-Allow-Origin", value: origin.origin });
        await session.send("Fetch.fulfillRequest", { requestId: event.requestId, responseCode, responseHeaders, body: body.toString("base64") });
        fulfilled.add(url); raw("fulfilled", { url, responseCode, responseHeaders });
      } catch (error) { rejected.push(url); raw("routing-error", { url, error: String(error) }); }
    });
    await session.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    record("page", { id: item.id, pid, target: target.targetInfo.targetId });
    page.on("requestfailed", request => raw("requestfailed", { url: request.url(), failure: request.failure() }));
    page.on("console", m => { raw("console", { type: m.type(), text: m.text(), location: m.location() }); if (m.type() === "error") errors.push({ kind: "console", text: m.text() }); });
    page.on("pageerror", e => { raw("pageerror", { message: e.message, stack: e.stack }); errors.push({ kind: "pageerror", text: e.message }); });
    await page.addInitScript(instrument);
    const start = Date.now();
    await page.goto(origin.url, { waitUntil: "load" });
    // The S8r host fixture is an actual finite server response. Chromium may omit
    // automatic icon requests under interception; verify the declared host independently.
    const icon = await context.request.get(origin.origin + '/favicon.ico');
    check("runtime.host-icon", icon.status() === 200 && (await icon.body()).equals(hostIcon), { status: icon.status() });
    // A real page request guarantees the absent host fixture reaches the same
    // absolute error predicate without relying on automatic icon scheduling.
    await page.evaluate(() => fetch('/favicon.ico').then(response => response.arrayBuffer()));
    for (const path of origin.fulfilled) fulfilled.add(origin.origin + path);
    const frames: Frame[] = [];
    async function frame(label: string) {
      const before = await snapshot(page);
      const file = join(info.outputDir, label + ".png");
      const buffer = await page.screenshot({ path: file, clip: before.box, animations: "allow" });
      const after = await snapshot(page), image = decodePng(buffer), region = classifyRegion(image);
      const f = { before, after, image, region, file }; frames.push(f);
      raw("frame", { before, after, region, file }); return f;
    }
    if (item.cohort === "gpu") {
      // No drawn-state wait: an absent/late engine must not prevent other observations.
      // Three observed wraps bracket two COMPLETE cycles, unlike a 24/30-second sleep.
      let wraps = 0, previous = (await snapshot(page)).phase;
      const cycleStart: number[] = [];
      for (let n = 0; n < 80; n++) {
        const f = await frame(`frame-${n}`);
        if (f.before.phase < previous - 0.5) { wraps++; cycleStart.push(n); }
        previous = f.before.phase;
        if (wraps >= 3 && Date.now() - start >= 30000) break;
        const targetPhase = ((Math.floor(f.after.phase * 20) + 1) % 20) / 20;
        await page.waitForFunction(({ selector, target }) => {
          const p = Number(getComputedStyle(document.querySelector(selector)!).getPropertyValue('--phase'));
          return p >= target && p < target + 0.02;
        }, { selector: hero, target: targetPhase }, { timeout: 13000, polling: 'raf' });
      }
      const complete = cycleStart.length >= 3;
      const populations = complete ? [cycleStart[1]-cycleStart[0], cycleStart[2]-cycleStart[1]] : [];
      check("runtime.full-cycles", complete && populations.every(n => n >= 12) && Date.now()-start >= 30000, { cycleStart, populations, elapsed: Date.now()-start });
      for (const state of treatments) {
        const selected = frames.filter(f => f.before.state === state && f.after.state === state);
        check(`runtime.${state}.population`, selected.length >= 2, selected.length);
        check(`runtime.${state}.region`, selected.length > 0 && selected.every(f => f.region.pass), selected.map(f => ({ file: f.file, failures: f.region.failures })));
        check(`runtime.${state}.identity`, selected.length > 0 && selected.every(f => [f.before, f.after].every(read => read.drawn === "drawn" && read.treatment === state && (state === "agentic" ? /^\d+x\d+$/.test(read.cells ?? "") : read.cells === null))), selected.map(f => ({ before: f.before, after: f.after })));
        const differences = selected.slice(1).map((f, i) => ({ a: selected[i].file, b: f.file, value: localDelta(selected[i], f) }));
        check(`runtime.${state}.change`, differences.some(d => d.value !== null && d.value.mean > 3), differences);
        if (state !== "agentic") check(`runtime.${state}.perimeter`, selected.length > 0 && selected.every(f => f.before.page?.length === 3 && f.region.background.every((v,c) => Math.abs(v-f.before.page![c]) <= 3)), selected.map(f => ({ background: f.region.background, page: f.before.page })));
      }
      for (const [a,b] of [["human","agentic"],["human","vibe"],["agentic","vibe"]]) {
        const fa = frames.find(f => f.before.state === a && f.region.pass), fb = frames.find(f => f.before.state === b && f.region.pass);
        const delta = fa && fb ? localDelta(fa,fb) : null;
        check(`runtime.pair.${a}-${b}`, delta !== null && delta.mean > 3, delta);
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600); const paused = await snapshot(page);
      await page.waitForTimeout(1500); const still = await snapshot(page);
      await page.evaluate(() => window.scrollTo(0,0));
      await page.waitForTimeout(600); const resumed = await frame("return");
      await page.waitForTimeout(1500); const progressed = await snapshot(page);
      check("runtime.intersection", paused.phase === still.phase && progressed.phase !== resumed.after.phase && JSON.stringify(paused.counters) === JSON.stringify(progressed.counters) && resumed.region.pass, { paused, still, resumed: resumed.after, progressed, region: resumed.region });
      const end = await snapshot(page);
      check("runtime.lifetime", end.canvasCount === 1 && end.counters.canvases === 1 && end.counters.contexts === 1 && end.counters.contextCalls === 1 && end.counters.successfulAdapters === 1 && end.counters.devices === 1 && end.counters.successfulDevices === 1, end);
    } else {
      await page.waitForTimeout(600);
      const before = await snapshot(page), rest = page.locator(hero + " pre");
      const text = await page.locator('body').innerText(), content = await rest.textContent(), visible = await rest.isVisible(), first = await rest.screenshot();
      await page.waitForTimeout(2500);
      const end = await snapshot(page), second = await rest.screenshot();
      check("runtime.plain.no-adapter", end.counters.adapters === 1 && end.counters.successfulAdapters === 0 && end.counters.devices === 0 && end.counters.contextCalls === 0 && end.counters.contexts === 0, end);
      check("runtime.plain.rest", visible && await rest.isVisible() && Boolean(content?.trim()) && content === await rest.textContent() && text === await page.locator('body').innerText() && first.equals(second) && before.drawn !== "drawn" && end.drawn !== "drawn", { before, end, visible, content, text });
      writeFileSync(join(info.outputDir,"rest.png"),second);
    }
    raw("instrument", await page.evaluate(() => (window as any).__runtime));
    check("runtime.routing", rejected.length === 0 && JSON.stringify([...fulfilled].sort()) === JSON.stringify(declared), { declared, fulfilled: [...fulfilled].sort(), rejected });
  } finally {
    await context.close(); record("context-close", { id: item.id, pid });
    check("runtime.zero-errors", errors.length === 0, errors);
    await origin.close();
    writeFileSync(join(info.outputDir, "outcomes.json"), JSON.stringify(outcomes,null,2));
    record("runtime-outcomes", { id: item.id, outcomes: outcomes.map(({predicate,pass})=>({predicate,pass})), output: info.outputDir });
  }
  expect(outcomes.length, "predicate:runtime.assertion-population").toBeGreaterThan(0);
  return outcomes;
}

if (import.meta.main) campaign("runtime", []).catch(error => { console.error(error); process.exitCode = 1; });

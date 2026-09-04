<script lang="ts">
  import { cubeFrames } from "./cube-frames";
  const loop = 12000;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let root: HTMLElement; let canvas: HTMLCanvasElement;
  let clock = $state(0); let drawn = $state(false);
  const phase = $derived(reduced ? 1 : clock / loop);
  const treatment = $derived.by(() => {
    const position = Math.sin(phase * Math.PI * 2);
    return position < -0.5 ? "human" : position > 0.5 ? "vibe" : "agentic";
  });
  $effect(() => {
    let raf = 0;
    let last = 0;
    let rendering = false;
    let engine: Awaited<ReturnType<typeof import("./hero-engine")["mountHero"]>> | undefined;
    const tick = (time: number) => {
      const dt = last ? time - last : 0;
      if (last) clock = (clock + dt) % loop;
      last = time;
      root.dataset.heroState = treatment;
      if (engine && !rendering) {
        rendering = true;
        const next = treatment;
        void engine.render(next, phase, dt).then((grid) => {
          root.dataset.heroTreatment = next;
          if (grid) root.dataset.heroCells = grid;
          else delete root.dataset.heroCells;
        }).finally(() => { rendering = false; });
      }
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(async ([entry]) => {
      cancelAnimationFrame(raf);
      if (!entry.isIntersecting) return;
      last = 0;
      if (!engine && "gpu" in navigator) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          const { mountHero } = await import("./hero-engine");
          const getContext = canvas.getContext.bind(canvas);
          let webgpu: RenderingContext | null = null;
          canvas.getContext = ((kind: string, options?: unknown) => {
            if (kind !== "webgpu") return getContext(kind as "2d", options as CanvasRenderingContext2DSettings);
            webgpu ??= getContext("webgpu" as never, options as never);
            return webgpu;
          }) as typeof canvas.getContext;
          const style = getComputedStyle(root);
          engine = await mountHero(canvas, {
            human: style.getPropertyValue("--role-prose").trim(),
            agentic: style.getPropertyValue("--role-agentic").trim(),
            vibe: style.getPropertyValue("--role-vibe").trim(),
          }, treatment);
          // build() starts no loop: this explicit step produces the first composited frame,
          // including the phase-1 reduced-motion rest frame, before the capture is hidden.
          const grid = await engine.render(treatment, phase, 0);
          if (grid) root.dataset.heroCells = grid;
          root.dataset.heroTreatment = treatment;
          drawn = true;
          root.dataset.heroGpu = "drawn";
        }
      }
      if (!reduced) raf = requestAnimationFrame(tick);
    }, { threshold: 0.2 });
    requestAnimationFrame(() => observer.observe(root));
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      engine?.dispose();
    };
  });
</script>
<div class="hero" bind:this={root} data-hero-id="spectrum-hero" data-hero-state="agentic" style:--phase={phase} aria-hidden="true">
  <svg class="spectrum" viewBox="0 0 548 96">
    <path class="rail" d="M82 48H466" />
    <rect x="58" y="24" width="48" height="48" data-hero-state="human" data-role="prose" />
    <rect x="250" y="24" width="48" height="48" data-hero-state="agentic" data-role="agentic" />
    <rect x="442" y="24" width="48" height="48" data-hero-state="vibe" data-role="vibe" />
    <circle class="dot" cx="0" cy="48" r="5" data-hero-part="dot" />
  </svg>
  <div class="canvas-wrap"><pre class:drawn>{cubeFrames[2].join("\n")}</pre><canvas bind:this={canvas} data-hero-canvas class:drawn></canvas></div>
</div>
<style>
.hero{width:100%;margin:40px 0 58px}.spectrum{width:100%;display:block;overflow:visible}.spectrum path,.spectrum rect,.spectrum circle{fill:none;stroke:currentColor;stroke-width:2;vector-effect:non-scaling-stroke}.spectrum rect[data-role="prose"]{color:var(--role-prose)}.spectrum rect[data-role="agentic"]{color:var(--role-agentic)}.spectrum rect[data-role="vibe"]{color:var(--role-vibe)}.spectrum .dot{fill:currentColor;stroke:none;transform:translateX(calc(274px + 192px * sin(360deg * var(--phase))))}.canvas-wrap{position:relative;width:100%;aspect-ratio:548/300}canvas,pre{position:absolute;inset:0;width:100%;height:100%}canvas{display:block;opacity:0}canvas.drawn{opacity:1}pre{margin:0;display:grid;place-content:center;font-family:var(--mono);font-size:12px;line-height:1em;white-space:pre;color:var(--role-agentic)}pre.drawn{visibility:hidden}@media(max-width:560px){.hero{margin:28px 0 42px}.canvas-wrap{aspect-ratio:390/260}}
</style>

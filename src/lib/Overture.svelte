<script lang="ts">
  import { onMount } from "svelte";
  import { cubeFrames } from "./cube-frames";
  const loop = 12000;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let root: HTMLElement; let canvas: HTMLCanvasElement;
  let clock = $state(0); let drawn = $state(false);
  const phase = $derived(reduced ? 1 : clock / loop);
  const treatment = $derived.by(() => {
    if (reduced) return "agentic";
    const segment = phase * 4;
    const landed = Math.floor(segment) + (segment % 1 >= 0.7 ? 1 : 0);
    return (["agentic", "vibe", "agentic", "human", "agentic"] as const)[landed];
  });
  onMount(() => {
    let raf = 0;
    let last = 0;
    let active = false;
    let disposed = false;
    let initialization: Promise<void> | undefined;
    let engine: Awaited<ReturnType<typeof import("./hero-engine")["mountHero"]>> | undefined;
    const render = (dt: number) => {
      root.dataset.heroState = treatment;
      if (!engine) return;
      const grid = engine.render(treatment, phase, dt);
      root.dataset.heroTreatment = treatment;
      if (grid) root.dataset.heroCells = grid;
      else delete root.dataset.heroCells;
      drawn = true;
      root.dataset.heroGpu = "drawn";
    };
    const tick = (time: number) => {
      if (!active || disposed) return;
      const dt = last ? time - last : 0;
      if (last) clock = (clock + dt) % loop;
      last = time;
      render(dt);
      raf = requestAnimationFrame(tick);
    };
    const initialize = async () => {
      if (!("gpu" in navigator)) return;
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter || disposed) return;
      const { mountHero } = await import("./hero-engine");
      if (disposed) return;
      const style = getComputedStyle(root);
      const mounted = await mountHero(canvas, {
        human: style.getPropertyValue("--role-prose").trim(),
        agentic: style.getPropertyValue("--role-agentic").trim(),
        vibe: style.getPropertyValue("--role-vibe").trim(),
      }, getComputedStyle(document.body).backgroundColor);
      if (disposed) { mounted.dispose(); return; }
      engine = mounted;
    };
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      cancelAnimationFrame(raf);
      last = 0;
      if (!active) return;
      initialization ??= initialize();
      void initialization.then(() => {
        // Re-entry can attach several continuations to one pending mount. Only one RAF survives.
        cancelAnimationFrame(raf);
        if (!active || disposed) return;
        render(0);
        if (!reduced) raf = requestAnimationFrame(tick);
      });
    }, { threshold: 0.2 });
    const observeFrame = requestAnimationFrame(() => observer.observe(root));
    return () => {
      disposed = true;
      active = false;
      cancelAnimationFrame(observeFrame);
      cancelAnimationFrame(raf);
      observer.disconnect();
      engine?.dispose();
    };
  });
</script>
<div class="hero" bind:this={root} data-hero-id="spectrum-hero" data-hero-state="agentic" style:--phase={phase} aria-hidden="true">
  <svg class="spectrum" viewBox="0 0 548 96">
    <path class="rail" d="M114 48H242 M306 48H434" />
    <rect x="58" y="24" width="48" height="48" data-hero-state="human" data-role="prose" />
    <rect x="250" y="24" width="48" height="48" data-hero-state="agentic" data-role="agentic" />
    <rect x="442" y="24" width="48" height="48" data-hero-state="vibe" data-role="vibe" />
    <circle class="dot" cx="0" cy="48" r="5" data-hero-part="dot" />
  </svg>
  <div class="canvas-wrap"><pre class:drawn>{cubeFrames[2].join("\n")}</pre><canvas bind:this={canvas} data-hero-canvas class:drawn></canvas></div>
</div>
<style>
.hero{width:100%;margin:40px 0 58px}.spectrum{width:100%;display:block;overflow:visible}.spectrum path,.spectrum rect,.spectrum circle{fill:none;stroke:currentColor;stroke-width:2;vector-effect:non-scaling-stroke}.spectrum rect[data-role="prose"]{color:var(--role-prose)}.spectrum rect[data-role="agentic"]{color:var(--role-agentic)}.spectrum rect[data-role="vibe"]{color:var(--role-vibe)}.spectrum .dot{fill:currentColor;stroke:none;animation:travel 12s paused both,dot-visible 12s steps(1,end) paused both;animation-delay:calc(-12s * var(--phase))}.spectrum rect{transform-box:fill-box;transform-origin:center;animation:middle-hit 12s paused both;animation-delay:calc(-12s * var(--phase))}.spectrum rect[data-role="prose"]{animation-name:human-hit}.spectrum rect[data-role="vibe"]{animation-name:vibe-hit}@keyframes dot-visible{0%,25%,50%,75%{opacity:1}17.5%,42.5%,67.5%,92.5%,100%{opacity:0}}@keyframes travel{0%{transform:translateX(274px);opacity:1;animation-timing-function:cubic-bezier(.2,.65,.3,1)}17.5%,24.99%{transform:translateX(466px);opacity:0}25%{transform:translateX(466px);opacity:1;animation-timing-function:cubic-bezier(.2,.65,.3,1)}42.5%,49.99%{transform:translateX(274px);opacity:0}50%{transform:translateX(274px);opacity:1;animation-timing-function:cubic-bezier(.2,.65,.3,1)}67.5%,74.99%{transform:translateX(82px);opacity:0}75%{transform:translateX(82px);opacity:1;animation-timing-function:cubic-bezier(.2,.65,.3,1)}92.5%,100%{transform:translateX(274px);opacity:0}}@keyframes vibe-hit{0%,17.49%,25%,100%{transform:scale(1);stroke-width:2}17.5%{transform:scale(1.12);stroke-width:3}21%{transform:scale(1.04);stroke-width:3}}@keyframes human-hit{0%,67.49%,75%,100%{transform:scale(1);stroke-width:2}67.5%{transform:scale(1.12);stroke-width:3}71%{transform:scale(1.04);stroke-width:3}}@keyframes middle-hit{0%,42.49%,50%,92.49%{transform:scale(1);stroke-width:2}42.5%,92.5%{transform:scale(1.12);stroke-width:3}46%,96%,100%{transform:scale(1.04);stroke-width:3}}@media(prefers-reduced-motion:reduce){.spectrum .dot{animation:none;transform:translateX(274px);opacity:1}.spectrum rect{animation:none}.spectrum rect[data-role="agentic"]{stroke-width:3}}.canvas-wrap{position:relative;width:100%;height:220px}canvas,pre{position:absolute;inset:0;width:100%;height:100%}canvas{display:block;opacity:0}canvas.drawn{opacity:1}pre{margin:0;display:grid;place-content:center;font-family:var(--mono);font-size:12px;line-height:1em;white-space:pre;color:var(--role-agentic)}pre.drawn{visibility:hidden}@media(max-width:560px){.hero{margin:28px 0 42px}}
</style>

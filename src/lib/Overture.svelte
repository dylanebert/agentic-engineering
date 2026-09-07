<script lang="ts">
  import { onMount } from "svelte";
  import { cubeFrame } from "./cube-frames";
  const loop = 12000;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let root: HTMLElement; let canvas: HTMLCanvasElement;
  let clock = $state(0); let drawn = $state(false);
  const phase = $derived(reduced ? 1 : clock / loop);
  // The dot travels the first 40% of each 3 s segment; the cube switches 75% of the way along.
  const switchAt = 0.3;
  const treatment = $derived.by(() => {
    if (reduced) return "agentic";
    const segment = phase * 4;
    const landed = Math.floor(segment) + (segment % 1 >= switchAt ? 1 : 0);
    return (["agentic", "vibe", "agentic", "human", "agentic"] as const)[landed];
  });
  // Veil the canvas around the switch so the treatment change reads as a dissolve, not a cut.
  const veil = $derived(reduced ? 0 : Math.max(0, 1 - Math.abs(((phase * 4) % 1) - switchAt) / 0.06));
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
      try {
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
      } catch (error) {
        if (!disposed) root.dataset.heroGpu = "unsupported";
        console.warn("Hero WebGPU initialization refused:", error);
      }
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
<div class="hero" bind:this={root} data-hero-id="spectrum-hero" data-hero-state="agentic" style:--phase={phase} style:--veil={veil} aria-hidden="true">
  <div class="canvas-wrap"><pre class:drawn>{cubeFrame.join("\n")}</pre><canvas bind:this={canvas} data-hero-canvas class:drawn></canvas></div>
  <svg class="spectrum" viewBox="0 0 548 64">
    <path class="rail" d="M82 40H466" />
    <circle class="node" cx="82" cy="40" r="14" data-hero-state="human" data-role="prose" />
    <circle class="node" cx="274" cy="40" r="14" data-hero-state="agentic" data-role="agentic" />
    <circle class="node" cx="466" cy="40" r="14" data-hero-state="vibe" data-role="vibe" />
    <circle class="dot" cx="0" cy="40" r="5" data-hero-part="dot" />
    <defs><filter id="hero-ink" color-interpolation-filters="sRGB" x="-10%" y="-10%" width="120%" height="120%">
      <feColorMatrix in="SourceGraphic" result="ink" type="matrix" values="0 0 0 0 .122  0 0 0 0 .435  0 0 0 0 .361  -1 0 0 1 0" />
      <feGaussianBlur in="ink" stdDeviation="5" result="soft" />
      <feComponentTransfer in="soft" result="glow"><feFuncA type="linear" slope=".9" /></feComponentTransfer>
      <feMerge><feMergeNode in="glow" /><feMergeNode in="ink" /></feMerge>
    </filter></defs>
  </svg>
  <div class="captions">
    <span class="caption" data-role="prose" class:live={treatment === "human"}>human</span>
    <span class="caption" data-role="agentic" class:live={treatment === "agentic"}>agentic engineering</span>
    <span class="caption" data-role="vibe" class:live={treatment === "vibe"}>vibe coding</span>
  </div>
</div>
<style>
.hero{width:100%;margin:40px 0 58px}.spectrum{width:100%;display:block;overflow:visible;margin-top:10px}.spectrum .rail{fill:none;stroke:var(--border);stroke-width:2;vector-effect:non-scaling-stroke}.spectrum .node{fill:currentColor;stroke:currentColor;stroke-opacity:.22;stroke-width:0;transform-box:fill-box;transform-origin:center;animation:middle-hit 12s paused both;animation-delay:calc(-12s * var(--phase))}.spectrum [data-role="prose"]{color:var(--role-prose)}.spectrum [data-role="agentic"]{color:var(--role-agentic)}.spectrum [data-role="vibe"]{color:var(--role-vibe)}.spectrum .node[data-role="prose"]{animation-name:human-hit}.spectrum .node[data-role="vibe"]{animation-name:vibe-hit}.spectrum .dot{stroke:none;transform-box:fill-box;transform-origin:center;animation:travel 12s paused both,dot-size 12s paused both,dot-ink 12s steps(1,end) paused both;animation-delay:calc(-12s * var(--phase))}@keyframes dot-ink{0%,24.99%{fill:var(--role-vibe)}25%,49.99%{fill:var(--role-agentic)}50%,74.99%{fill:var(--role-prose)}75%,100%{fill:var(--role-agentic)}}@keyframes travel{0%{translate:274px 0;animation-timing-function:cubic-bezier(.37,0,.63,1)}10%,24.99%{translate:466px 0}25%{translate:466px 0;animation-timing-function:cubic-bezier(.37,0,.63,1)}35%,49.99%{translate:274px 0}50%{translate:274px 0;animation-timing-function:cubic-bezier(.37,0,.63,1)}60%,74.99%{translate:82px 0}75%{translate:82px 0;animation-timing-function:cubic-bezier(.37,0,.63,1)}85%,100%{translate:274px 0}}@keyframes dot-size{0%,10%,25%,35%,50%,60%,75%,85%,100%{scale:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}5%,30%,55%,80%{scale:1;animation-timing-function:cubic-bezier(.37,0,.63,1)}}@keyframes vibe-hit{0%,35%,100%{transform:scale(1);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}10%,25%{transform:scale(1.2);stroke-width:8;animation-timing-function:cubic-bezier(.37,0,.63,1)}}@keyframes human-hit{0%,50%,85%,100%{transform:scale(1);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}60%,75%{transform:scale(1.12);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}}@keyframes middle-hit{10%,25%,60%,75%{transform:scale(1);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}0%,35%,50%,85%,100%{transform:scale(1.12);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}}@media(prefers-reduced-motion:reduce){.spectrum .dot{animation:none;translate:274px 0;scale:1;fill:var(--role-agentic)}.spectrum .node{animation:none}.spectrum .node[data-role="agentic"]{transform:scale(1.12)}}.canvas-wrap{position:relative;width:100%;height:280px}canvas,pre{position:absolute;top:0;bottom:0;left:50%;width:280px;height:100%;transform:translateX(-50%)}canvas{display:block;opacity:0}canvas.drawn{opacity:calc(1 - .9 * var(--veil));filter:blur(calc(6px * var(--veil)))}.hero:global([data-hero-treatment="agentic"]) canvas.drawn{filter:brightness(2.4) invert(1) url(#hero-ink) blur(calc(6px * var(--veil)))}pre{margin:0;display:grid;place-content:center;font-family:var(--mono);font-size:12px;line-height:9px;letter-spacing:1.8px;white-space:pre;color:var(--role-agentic)}pre.drawn{visibility:hidden}.captions{position:relative;height:20px;margin-top:2px;font-family:var(--mono);font-size:13px;letter-spacing:.04em;line-height:20px}.caption{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap;color:currentColor;opacity:0}.caption.live{opacity:calc(.8 - .8 * var(--veil))}.caption[data-role="prose"]{left:15%;color:var(--role-prose)}.caption[data-role="agentic"]{left:50%;color:var(--role-agentic)}.caption[data-role="vibe"]{left:85%;color:var(--role-vibe)}@media(max-width:560px){.captions{font-size:12px}}.canvas-wrap{position:relative;width:100%;height:280px}canvas,pre{position:absolute;top:0;bottom:0;left:50%;width:280px;height:100%;transform:translateX(-50%)}canvas{display:block;opacity:0}canvas.drawn{opacity:calc(1 - .9 * var(--veil));filter:blur(calc(6px * var(--veil)))}.hero:global([data-hero-treatment="agentic"]) canvas.drawn{filter:brightness(2.4) invert(1) url(#hero-ink) blur(calc(6px * var(--veil)))}pre{margin:0;display:grid;place-content:center;font-family:var(--mono);font-size:12px;line-height:9px;letter-spacing:1.8px;white-space:pre;color:var(--role-agentic)}pre.drawn{visibility:hidden}@media(max-width:560px){.hero{margin:28px 0 42px}}
</style>

<script lang="ts">
  import { onMount } from "svelte";
  import poster from "./hero-poster.png";
  import type { HeroTreatment } from "./hero-engine";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let root: HTMLElement; let canvas: HTMLCanvasElement;
  let drawn = $state(false); let live = $state(false);
  let phase = $state(reduced ? 1 : 0);
  let treatment = $state<HeroTreatment>("agentic");
  let veil = $state(0);
  onMount(() => {
    let disposed = false;
    let engine: Awaited<ReturnType<typeof import("./hero-engine")["mountHero"]>> | undefined;
    const initialize = async () => {
      if (!("gpu" in navigator)) return;
      try {
        // mountHero owns the single adapter/device admission used by the public engine.
        const { mountHero } = await import("./hero-engine");
        if (disposed) return;
        const style = getComputedStyle(root);
        const mounted = await mountHero(canvas, {
          human: style.getPropertyValue("--role-prose").trim(),
          agentic: style.getPropertyValue("--role-agentic").trim(),
          vibe: style.getPropertyValue("--role-vibe").trim(),
        }, getComputedStyle(document.body).backgroundColor, reduced, state => {
          if (disposed) return;
          phase = state.phase;
          treatment = state.treatment;
          veil = state.veil;
          drawn = state.presented;
          live = state.live;
          root.dataset.heroState = treatment;
          root.dataset.heroTreatment = treatment;
          if (drawn) root.dataset.heroGpu = "drawn";
        });
        if (disposed) { mounted.dispose(); return; }
        engine = mounted;
      } catch (error) {
        engine?.dispose();
        engine = undefined;
        if (!disposed) root.dataset.heroGpu = "unsupported";
        console.warn("Hero WebGPU initialization refused:", error);
      }
    };
    void initialize();
    return () => {
      disposed = true;
      engine?.dispose();
    };
  });
</script>
<div class="hero" bind:this={root} data-hero-id="spectrum-hero" data-hero-state="agentic" style:--phase={phase} style:--veil={veil} aria-hidden="true">
  <div class="canvas-wrap"><div class="scene-ink"><img src={poster} alt="" width="560" height="560" data-hero-poster class:hidden={live} /><canvas bind:this={canvas} data-hero-canvas class:drawn></canvas></div></div>
  <svg class="spectrum" viewBox="0 0 548 64">
    <path class="rail" d="M82 40H466" />
    <circle class="node" cx="82" cy="40" r="14" data-hero-state="human" data-role="prose" />
    <circle class="node" cx="274" cy="40" r="14" data-hero-state="agentic" data-role="agentic" />
    <circle class="node" cx="466" cy="40" r="14" data-hero-state="vibe" data-role="vibe" />
    <circle class="dot" cx="0" cy="40" r="5" data-hero-part="dot" />
    <defs><filter id="hero-ink" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0 0 0 0 .122  0 0 0 0 .435  0 0 0 0 .361  .2126 .7152 .0722 0 0" />
    </filter></defs>
  </svg>
  <div class="captions">
    <span class="caption" data-role="prose" class:live={treatment === "human"}>human</span>
    <span class="caption" data-role="agentic" class:live={treatment === "agentic"}>agentic engineering</span>
    <span class="caption" data-role="vibe" class:live={treatment === "vibe"}>vibe coding</span>
  </div>
</div>
<style>
.hero{width:100%;margin:40px 0 58px}.spectrum{width:100%;display:block;overflow:visible;margin-top:10px}.spectrum .rail{fill:none;stroke:var(--border);stroke-width:2;vector-effect:non-scaling-stroke}.spectrum .node{fill:currentColor;stroke:currentColor;stroke-opacity:.22;stroke-width:0;transform-box:fill-box;transform-origin:center;animation:middle-hit 12s paused both;animation-delay:calc(-12s * var(--phase))}.spectrum [data-role="prose"]{color:var(--role-prose)}.spectrum [data-role="agentic"]{color:var(--role-agentic)}.spectrum [data-role="vibe"]{color:var(--role-vibe)}.spectrum .node[data-role="prose"]{animation-name:human-hit}.spectrum .node[data-role="vibe"]{animation-name:vibe-hit}.spectrum .dot{stroke:none;transform-box:fill-box;transform-origin:center;animation:travel 12s paused both,dot-size 12s paused both,dot-ink 12s steps(1,end) paused both;animation-delay:calc(-12s * var(--phase))}@keyframes dot-ink{0%,24.99%{fill:var(--role-vibe)}25%,49.99%{fill:var(--role-agentic)}50%,74.99%{fill:var(--role-prose)}75%,100%{fill:var(--role-agentic)}}@keyframes travel{0%{translate:274px 0;animation-timing-function:cubic-bezier(.37,0,.63,1)}10%,24.99%{translate:466px 0}25%{translate:466px 0;animation-timing-function:cubic-bezier(.37,0,.63,1)}35%,49.99%{translate:274px 0}50%{translate:274px 0;animation-timing-function:cubic-bezier(.37,0,.63,1)}60%,74.99%{translate:82px 0}75%{translate:82px 0;animation-timing-function:cubic-bezier(.37,0,.63,1)}85%,100%{translate:274px 0}}@keyframes dot-size{0%,10%,25%,35%,50%,60%,75%,85%,100%{scale:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}5%,30%,55%,80%{scale:1;animation-timing-function:cubic-bezier(.37,0,.63,1)}}@keyframes vibe-hit{0%,35%,100%{transform:scale(1);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}10%,25%{transform:scale(1.2);stroke-width:8;animation-timing-function:cubic-bezier(.37,0,.63,1)}}@keyframes human-hit{0%,50%,85%,100%{transform:scale(1);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}60%,75%{transform:scale(1.12);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}}@keyframes middle-hit{10%,25%,60%,75%{transform:scale(1);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}0%,35%,50%,85%,100%{transform:scale(1.12);stroke-width:0;animation-timing-function:cubic-bezier(.37,0,.63,1)}}@media(prefers-reduced-motion:reduce){.spectrum .dot{animation:none;translate:274px 0;scale:1;fill:var(--role-agentic)}.spectrum .node{animation:none}.spectrum .node[data-role="agentic"]{transform:scale(1.12)}}.canvas-wrap :global(.frame-error){position:absolute;inset:0;display:grid;place-items:center;background:#141210;color:#f0e6d6;padding:8px;font:13px/20px system-ui;text-align:center}.canvas-wrap{position:relative;width:280px;height:280px;margin:auto}.scene-ink{position:absolute;inset:0}.hero:global([data-hero-state="agentic"]) .scene-ink{filter:url(#hero-ink)}canvas,img{position:absolute;inset:0;width:100%;height:100%;display:block}canvas{opacity:0;transition:opacity 200ms ease-out}canvas.drawn{opacity:calc(1 - .9 * var(--veil));filter:blur(calc(6px * var(--veil)))}img.hidden{visibility:hidden}@media(prefers-reduced-motion:reduce){canvas{transition:none}}.captions{position:relative;height:20px;margin-top:2px;font-family:var(--mono);font-size:13px;letter-spacing:.04em;line-height:20px}.caption{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap;color:currentColor;opacity:0}.caption.live{opacity:calc(.8 - .8 * var(--veil))}.caption[data-role="prose"]{left:15%;color:var(--role-prose)}.caption[data-role="agentic"]{left:50%;color:var(--role-agentic)}.caption[data-role="vibe"]{left:85%;color:var(--role-vibe)}@media(max-width:560px){.captions{font-size:12px}}@media(max-width:560px){.hero{margin:28px 0 42px}}
</style>

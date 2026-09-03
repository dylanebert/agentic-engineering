<script lang="ts">
  import { cubeFrames } from "./cube-frames";

  const loop = 6000;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let root: HTMLElement;
  let clock = $state(0);
  const phase = $derived(reduced ? 1 : clock / loop);
  const frame = $derived(reduced ? cubeFrames[2] : cubeFrames[Math.floor((clock / loop) * cubeFrames.length) % cubeFrames.length]);

  $effect(() => {
    if (reduced) return;
    let raf = 0;
    let last = 0;
    const tick = (time: number) => {
      if (last) clock = (clock + time - last) % loop;
      last = time;
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    }, { threshold: 0.2 });
    observer.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  });
</script>

<div class="overture" bind:this={root} data-overture-id="spectrum-overture" style:--phase={phase} aria-hidden="true">
  <div class="skin human" data-overture-state="human" data-role="prose">
    <svg viewBox="0 0 176 176" aria-hidden="true">
      <path d="M48 48 92 27 139 52 139 105 94 129 47 102Z M48 48 95 75 139 52 M95 75 94 129" />
    </svg>
  </div>
  <div class="skin agentic" data-overture-state="agentic" data-role="agentic">
    <pre>{frame.join("\n")}</pre>
  </div>
  <div class="skin vibe" data-overture-state="vibe" data-role="vibe">
    <svg viewBox="0 0 176 176" aria-hidden="true">
      <path d="M48 48 92 27 139 52 139 105 94 129 47 102Z M48 48 95 75 139 52 M95 75 94 129" />
    </svg>
  </div>
</div>

<style>
  .overture {
    width: 100%;
    min-height: 210px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    margin: 46px 0 62px;
    overflow: visible;
  }

  .skin {
    width: 100%;
    min-width: 0;
    display: grid;
    place-items: center;
    opacity: calc(0.58 + 0.42 * var(--focus));
    transform: translateY(calc((1 - var(--focus)) * 8px)) scale(calc(0.92 + var(--focus) * 0.08));
  }

  .human { --offset: 0.333333; color: var(--role-prose); }
  .agentic { --offset: 0; color: var(--role-agentic); }
  .vibe { --offset: 0.666667; color: var(--role-vibe); }
  .human, .agentic, .vibe {
    --focus: clamp(0, calc(1 - 3 * abs(mod(calc(var(--phase) - var(--offset) + 0.5), 1) - 0.5)), 1);
  }

  svg { width: 176px; height: 176px; overflow: visible; }
  svg path { fill: none; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .vibe svg { filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 18px currentColor); }
  .vibe path { stroke-width: 2.5; }

  pre {
    width: 176px;
    font-family: var(--mono);
    font-size: 8px;
    line-height: 1em;
    white-space: pre;
    color: currentColor;
    overflow: visible;
  }

  @media (max-width: 560px) {
    .overture {
      min-height: 176px;
      margin: 32px 0 46px;
      overflow: hidden;
    }
  }
</style>

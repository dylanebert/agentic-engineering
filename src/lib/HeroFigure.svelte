<script lang="ts">
  import { onMount } from "svelte";
  import { startHero } from "./hero";

  const steps = ["ask", "spec", "stage", "verify", "repeat"] as const;
  let active = $state(0);
  let error = $state("");

  onMount(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;

    startHero(() => active)
      .then((app) => {
        if (cancelled) app.dispose();
        else dispose = () => app.dispose();
      })
      .catch((reason: unknown) => {
        error = reason instanceof Error ? reason.message : String(reason);
      });

    return () => {
      cancelled = true;
      dispose?.();
    };
  });
</script>

<section class="hero" aria-label="agentic engineering walkthrough">
  <div class="canvas-wrap">
    <canvas aria-label="Shallot visualization of the agentic engineering loop"></canvas>
    {#if error}
      <p class="error">WebGPU visualization unavailable.</p>
    {/if}
  </div>

  <div class="steps" aria-label="walkthrough steps">
    {#each steps as step, index}
      <button
        class:active={index === active}
        aria-current={index === active ? "step" : undefined}
        onclick={() => (active = index)}
      >{step}</button>
    {/each}
  </div>

  <div class="controls">
    <button onclick={() => (active = Math.max(0, active - 1))} disabled={active === 0}>back</button>
    <span>{active + 1} / {steps.length}</span>
    <button
      onclick={() => (active = Math.min(steps.length - 1, active + 1))}
      disabled={active === steps.length - 1}
    >next</button>
  </div>
</section>

<style>
  .hero {
    margin-top: 28px;
  }

  .canvas-wrap {
    position: relative;
    height: 320px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-2);
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }

  .error {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    background: var(--surface-2);
    font-family: var(--display);
    font-size: var(--label-font-size);
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    margin-top: 10px;
  }

  button {
    border: 0;
    background: transparent;
    color: var(--text-muted);
    font-family: var(--display);
    font-size: var(--label-font-size);
    cursor: pointer;
  }

  .steps button {
    padding: 7px 4px;
    border-bottom: 1px solid var(--border);
  }

  .steps button.active {
    border-color: var(--accent);
    color: var(--ink);
  }

  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 9px;
    color: var(--text-muted);
    font-family: var(--mono);
    font-size: var(--label-font-size);
  }

  .controls button {
    padding: 4px 0;
  }

  button:hover:not(:disabled) {
    color: var(--accent);
  }

  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  button:disabled {
    cursor: default;
    opacity: 0.35;
  }

  @media (max-width: 560px) {
    .canvas-wrap {
      height: 240px;
    }
  }
</style>

<script lang="ts">
  import { onMount } from "svelte";
  import { startHero } from "./hero";

  let container: HTMLElement;
  let error = $state(false);

  onMount(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;

    startHero(container)
      .then((app) => {
        if (cancelled) app.dispose();
        else dispose = () => app.dispose();
      })
      .catch(() => {
        error = true;
      });

    return () => {
      cancelled = true;
      dispose?.();
    };
  });
</script>

<div class="hero" bind:this={container}>
  <canvas aria-label="Interactive cube rendered with Shallot"></canvas>
  {#if error}
    <p>WebGPU visualization unavailable.</p>
  {/if}
</div>

<style>
  .hero {
    position: relative;
    height: 320px;
    margin-top: 28px;
    overflow: hidden;
    background: #fff;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }

  p {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    background: #fff;
    font-family: var(--display);
    font-size: var(--label-font-size);
  }

  @media (max-width: 560px) {
    .hero {
      height: 240px;
    }
  }
</style>

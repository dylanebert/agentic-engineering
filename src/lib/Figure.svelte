<script lang="ts">
  // The page's one figure primitive: a `figure` element with no figcaption (the paragraph
  // before it does the caption's job), sized to the prose measure, animating only while it is
  // on screen. The observer and `reduced` shape are ported from taste-loops'
  // src/lib/LatencyFigure.svelte @ 78ea88c: under prefers-reduced-motion the clock never
  // starts and the figure renders its fully-drawn resting state instead.
  //
  // Children read the clock through the snippet argument, so the resting state is the child's
  // own decision: `reduced` is true and `elapsed` is pinned at `loop`, one full cycle in.

  import type { Snippet } from "svelte";

  let {
    id,
    label,
    loop = 4000,
    threshold = 0.2,
    children,
  }: {
    /** The manifest entry's id (src/lib/figures.ts). The figure arms site each entry by it. */
    id: string;
    label: string;
    loop?: number;
    threshold?: number;
    children: Snippet<[{ elapsed: number; reduced: boolean }]>;
  } = $props();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let clock = $state(0);
  let root: HTMLElement;

  // At rest under reduced motion the figure sits one full cycle in: fully drawn, never ticking.
  const elapsed = $derived(reduced ? loop : clock);

  $effect(() => {
    if (reduced) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (last) clock = (clock + t - last) % loop;
      last = t;
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        cancelAnimationFrame(raf);
        if (entry.isIntersecting) {
          last = 0;
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold },
    );
    io.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  });
</script>

<figure
  class="figure"
  bind:this={root}
  aria-label={label}
  data-figure={label}
  data-figure-id={id}
>
  {@render children({ elapsed, reduced })}
</figure>

<style>
  .figure {
    width: 100%;
    max-width: var(--measure);
    margin: var(--section-margin-top) auto;
    padding: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .figure :global(*) {
      transition: none;
      animation: none;
    }
  }
</style>

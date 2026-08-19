<script lang="ts">
  // The loop: spec → stage → verify → repeat. Three stage chips in order, with a highlight that
  // lands on the active chip. --pos (0-1, snapped to 0 / 0.5 / 1 = spec / stage / verify) drives the
  // highlight — exactly the path the gate and the Scrub write — so the figure's claim is CSS-driven
  // from the root, not from Svelte state. The auto-advance rAF cycles --pos on a beat (motion only,
  // IntersectionObserver-gated, paused the moment the reader scrubs); under reduced motion it never
  // starts and the resting state is fully drawn: all three chips visible, highlight at the active
  // stage. The "landing on the beat" is the highlight sliding to the next chip each beat.
  import Scrub from "./Scrub.svelte";

  let root: HTMLElement;
  let pos = $state(0);
  let paused = $state(false);

  const stages = ["spec", "stage", "verify"];
  const POINTS = [0, 0.5, 1];
  const beat = 900; // ms per stage, illustrative

  function setPos(p: number): void {
    paused = true; // reader took over — stop the auto-advance
    pos = Math.max(0, Math.min(1, p));
    root.style.setProperty("--pos", pos.toFixed(4));
  }

  $effect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    const tick = (t: number) => {
      if (paused || mq.matches) {
        raf = 0;
        return;
      }
      if (last) elapsed = (elapsed + t - last) % (beat * stages.length);
      last = t;
      const idx = Math.floor(elapsed / beat) % stages.length;
      const next = POINTS[idx];
      pos = next;
      root.style.setProperty("--pos", next.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        cancelAnimationFrame(raf);
        if (e.isIntersecting && !paused && !mq.matches) {
          last = 0;
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  });
</script>

<div class="loop" bind:this={root} style="--pos: 0">
  <div class="row">
    <div class="chips">
      {#each stages as s, i (s)}
        <div class="chip">
          <span class="chip-name">{s}</span>
          <span class="chip-ord">{i + 1}</span>
        </div>
      {/each}
      <div class="highlight" aria-hidden="true"></div>
    </div>
    <span class="repeat" aria-hidden="true">↻</span>
  </div>
  <Scrub pos={pos} onSetPos={setPos} points={POINTS} ariaLabel="loop stage" />
  <p class="caption">spec → stage → verify → repeat</p>
</div>

<style>
  .loop {
    --pos: 0;
    margin-top: 28px;
  }

  .row {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }

  .chips {
    position: relative;
    flex: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 4px;
  }

  .chip {
    position: relative;
    height: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    z-index: 1;
  }

  .chip-name {
    font-family: var(--display);
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }

  .chip-ord {
    font-family: var(--display);
    font-size: 10px;
    color: var(--text-muted);
  }

  .highlight {
    position: absolute;
    top: 4px;
    bottom: 4px;
    /* 3 chips at centers 1/6, 1/2, 5/6 of the chip row; --pos 0/0.5/1 maps to those centers */
    left: calc((var(--pos, 0) * 0.6667 + 0.1667) * 100%);
    width: calc(33.333% - 6px);
    transform: translateX(-50%);
    background: color-mix(in srgb, var(--accent) 22%, var(--surface-2));
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    transition: left 0.25s var(--ease-out);
    z-index: 0;
    pointer-events: none;
  }

  .repeat {
    display: grid;
    place-items: center;
    width: 32px;
    font-family: var(--display);
    font-size: 20px;
    color: var(--text-muted);
  }

  .caption {
    margin-top: 10px;
    font-family: var(--display);
    font-size: 13px;
    color: var(--text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .highlight {
      transition: none;
    }
  }
</style>

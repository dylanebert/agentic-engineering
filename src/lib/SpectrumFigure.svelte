<script lang="ts">
  // The spectrum: a draggable handle on the vibe-coding to organic-human-code axis. The page's
  // claim is the space between, so the handle rests at the midpoint under reduced motion. The
  // drag is the standard scrub (ew-resize, full-height hit area, one gesture); the track and
  // labels hold still while only the handle and fill move (ui.md: nothing moves under its own
  // gesture). --pos (0-1) drives the handle and fill; the variance gate sets it directly, the
  // drag handler computes it from the pointer.
  let root: HTMLElement;
  let track: HTMLElement;
  let ariaNow = $state(50);

  function update(clientX: number): void {
    const rect = track.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    root.style.setProperty("--pos", p.toFixed(4));
    ariaNow = Math.round(p * 100);
  }

  function onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    update(e.clientX);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    update(e.clientX);
  }
</script>

<div class="spectrum" bind:this={root} style="--pos: 0.5">
  <div class="axis-labels">
    <span>vibe coding</span>
    <span>organic human code</span>
  </div>
  <div class="track" bind:this={track}>
    <div class="fill"></div>
    <div
      class="handle"
      role="slider"
      aria-label="position on the spectrum"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={ariaNow}
      tabindex="0"
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
    ></div>
  </div>
  <p class="caption">vibe coding to organic human code</p>
</div>

<style>
  .spectrum {
    --pos: 0.5;
    margin-top: 28px;
  }

  .axis-labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-family: var(--display);
    font-size: 13px;
    color: var(--text-muted);
  }

  .track {
    position: relative;
    height: 36px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: calc(var(--pos) * 100%);
    background: var(--accent);
    border-radius: calc(var(--radius) - 1px);
  }

  .handle {
    position: absolute;
    top: -4px;
    bottom: -4px;
    left: calc(var(--pos) * 100%);
    transform: translateX(-50%);
    width: 28px;
    cursor: ew-resize;
    background: var(--ink);
    border-radius: var(--radius);
    touch-action: none;
    transition: scale 0.1s var(--ease-out);
  }

  .handle:active {
    scale: 1.1;
  }

  .caption {
    margin-top: 10px;
    font-family: var(--display);
    font-size: 13px;
    color: var(--text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .handle {
      transition: none;
    }
  }
</style>

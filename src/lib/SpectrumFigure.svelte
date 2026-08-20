<script lang="ts">
  // The spectrum: a draggable handle on the vibe-coding to organic-human-code axis. The page's
  // claim is the space between, so the handle rests at the midpoint under reduced motion. The
  // drag is the standard scrub (ew-resize, full-height hit area, one gesture); the track and
  // labels hold still while only the handle and fill move (ui.md: nothing moves under its own
  // gesture). --pos (0-1) drives the handle and fill; the variance gate sets it directly, the
  // drag handler computes it from the pointer.
  let root: HTMLElement;
  let track: HTMLElement;
  let pos = $state(0.5);
  let ariaNow = $state(50);

  // Single code path for both pointer and keyboard: clamp a normalized 0-1 value, write --pos,
  // keep aria-valuenow truthful.
  function setPos(p: number): void {
    pos = Math.max(0, Math.min(1, p));
    root.style.setProperty("--pos", pos.toFixed(4));
    ariaNow = Math.round(pos * 100);
  }

  function update(clientX: number): void {
    const rect = track.getBoundingClientRect();
    setPos((clientX - rect.left) / rect.width);
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

  // Keyboard step matches the variance gate's six positions (0, 0.2, 0.4, 0.6, 0.8, 1.0) so
  // Left/Right walks the same points the gate tests.
  const STEP = 1 / 5;

  function onKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        setPos(pos - STEP);
        e.preventDefault();
        break;
      case "ArrowRight":
      case "ArrowUp":
        setPos(pos + STEP);
        e.preventDefault();
        break;
      case "Home":
        setPos(0);
        e.preventDefault();
        break;
      case "End":
        setPos(1);
        e.preventDefault();
        break;
    }
  }
</script>

<div class="spectrum" bind:this={root} style="--pos: 0.5">
  <div class="axis-labels">
    <span>vibe coding</span>
    <span>organic human code</span>
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="track"
    bind:this={track}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
  >
    <div class="fill"></div>
    <div
      class="handle"
      role="slider"
      aria-label="position on the spectrum"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={ariaNow}
      tabindex="0"
      onkeydown={onKeyDown}
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
    cursor: ew-resize;
    touch-action: none;
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
    background: var(--ink);
    border-radius: var(--radius);
    transition: scale 0.1s var(--ease-out);
  }

  .handle:active {
    scale: 1.1;
  }

  .caption {
    margin-top: 10px;
    font-family: var(--sans);
    font-size: 13px;
    color: var(--text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .handle {
      transition: none;
    }
  }
</style>

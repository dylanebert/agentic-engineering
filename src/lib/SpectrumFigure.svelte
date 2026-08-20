<script lang="ts">
  // The spectrum: a draggable handle on the vibe-coding to organic-human-code axis. The page's
  // claim is the space between, so the handle rests at the midpoint under reduced motion. The
  // drag is the standard pick-up-and-move (grab/grabbing, full-height hit area, one gesture); the
  // track and labels hold still while only the handle and fill move (ui.md: nothing moves under
  // its own gesture). --pos (0-1) is set on :root so the whole page restyles — neon-purple vibe
  // at 0, kex at 0.5, Windows 98 chrome at 1 (stage I). The variance gate sets --pos directly,
  // the drag handler computes it from the pointer.
  let track: HTMLElement;
  let pos = $state(0.5);
  let ariaNow = $state(50);
  let dragging = $state(false);

  // Single code path for both pointer and keyboard: clamp a normalized 0-1 value, write --pos on
  // :root so the page-wide morph responds, keep aria-valuenow truthful. color-scheme mirrors the
  // bg polarity: dark below pos 0.25 (vibe dress), light at or above (kex/win98 dress), so UA
  // surfaces (scrollbar, overscroll) match the page a real drag produces.
  function setPos(p: number): void {
    pos = Math.max(0, Math.min(1, p));
    document.documentElement.style.setProperty("--pos", pos.toFixed(4));
    document.documentElement.style.colorScheme = pos < 0.25 ? "dark" : "light";
    // Type/chrome vocabulary swap: font-family and text-transform can't be interpolated, so they
    // snap via a class when --pos crosses 0.875 (the --snap2 threshold). Every gate driver mirrors
    // this toggle so a driven pos=1 reaches the same win98 vocabulary a hand drag does.
    document.documentElement.classList.toggle("win98", pos >= 0.875);
    ariaNow = Math.round(pos * 100);
  }

  function update(clientX: number): void {
    const rect = track.getBoundingClientRect();
    setPos((clientX - rect.left) / rect.width);
  }

  function onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging = true;
    update(e.clientX);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    update(e.clientX);
  }

  function onPointerUp(e: PointerEvent): void {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    dragging = false;
  }

  // Keyboard step fine enough to walk the interior — the figure's whole claim is the space
  // between the endpoints, not just the three sampled positions the gates test.
  const STEP = 0.05;

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

<div class="spectrum">
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
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <div class="fill"></div>
    <div
      class="handle"
      class:grabbing={dragging}
      role="slider"
      aria-label="position on the spectrum"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={ariaNow}
      tabindex="0"
      onkeydown={onKeyDown}
    ></div>
  </div>
  <p class="descriptors">
    <span class="descriptor-left">the color a model picks by default</span>
    <span class="descriptor-right">every line written by hand</span>
  </p>
</div>

<style>
  .spectrum {
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
    box-shadow: var(--bevel);
    touch-action: none;
  }

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: calc(var(--pos) * 100%);
    background: var(--accent);
    border-radius: calc(var(--radius) - 1px);
    box-shadow: var(--glow);
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
    box-shadow: var(--bevel);
    cursor: grab;
    transition: scale 0.1s var(--ease-out);
  }

  .handle.grabbing {
    cursor: grabbing;
  }

  .handle:active {
    scale: 1.1;
  }

  .descriptors {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-family: var(--sans);
    font-size: 13px;
    color: var(--text-muted);
  }
</style>

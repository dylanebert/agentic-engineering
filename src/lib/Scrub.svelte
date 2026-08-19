<script lang="ts">
  // Shared scrub idiom: a track-wide hit area with a slider handle, pointer and keyboard operated
  // through one setPos path. Carries the a11y suppression for the presentational track (the handle
  // holds the slider role). The handle reads --pos from the figure root it lives in, so the gate
  // (which sets --pos on that root) drives the same thing a reader's drag drives. Used by the loop
  // and spec figures; the spectrum and verification figures predate it and keep their inline copies
  // — unifying all four is a later refactor, reported as residue.
  let {
    pos,
    onSetPos,
    points,
    ariaLabel = "position",
    step = 0.05,
    height = 24,
  }: {
    pos: number;
    onSetPos: (p: number) => void;
    points?: number[];
    ariaLabel?: string;
    step?: number;
    height?: number;
  } = $props();

  let track: HTMLElement;

  function update(clientX: number): void {
    const rect = track.getBoundingClientRect();
    onSetPos((clientX - rect.left) / rect.width);
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

  function nearestIndex(): number {
    if (!points) return -1;
    return points.reduce(
      (best, p, i) => (Math.abs(p - pos) < Math.abs(points[best] - pos) ? i : best),
      0,
    );
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (points) {
      const idx = nearestIndex();
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          onSetPos(points[Math.max(0, idx - 1)]);
          e.preventDefault();
          break;
        case "ArrowRight":
        case "ArrowUp":
          onSetPos(points[Math.min(points.length - 1, idx + 1)]);
          e.preventDefault();
          break;
        case "Home":
          onSetPos(points[0]);
          e.preventDefault();
          break;
        case "End":
          onSetPos(points[points.length - 1]);
          e.preventDefault();
          break;
      }
    } else {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          onSetPos(pos - step);
          e.preventDefault();
          break;
        case "ArrowRight":
        case "ArrowUp":
          onSetPos(pos + step);
          e.preventDefault();
          break;
        case "Home":
          onSetPos(0);
          e.preventDefault();
          break;
        case "End":
          onSetPos(1);
          e.preventDefault();
          break;
      }
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="track"
  bind:this={track}
  style="height: {height}px"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
>
  <div
    class="handle"
    role="slider"
    aria-label={ariaLabel}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round(pos * 100)}
    tabindex="0"
    onkeydown={onKeyDown}
  ></div>
</div>

<style>
  .track {
    position: relative;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: ew-resize;
    touch-action: none;
  }

  .handle {
    position: absolute;
    top: -4px;
    bottom: -4px;
    left: calc(var(--pos, 0.5) * 100%);
    transform: translateX(-50%);
    width: 24px;
    background: var(--ink);
    border-radius: var(--radius);
    transition: scale 0.1s var(--ease-out);
  }

  .handle:active {
    scale: 1.1;
  }

  @media (prefers-reduced-motion: reduce) {
    .handle {
      transition: none;
    }
  }
</style>

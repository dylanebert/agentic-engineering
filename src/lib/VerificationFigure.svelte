<script lang="ts">
  // The three verification types priced by cost against reach. A 2D plot with cost on the
  // horizontal axis and reach on the vertical, three points at their stated positions, and a
  // draggable handle on the cost axis that moves a highlight along the cost-reach diagonal.
  // The drag shares the spectrum's scrub idiom (ew-resize, full-height hit area, one gesture).
  // --pos (0-1) drives both the handle and the highlight; the variance gate sets it directly,
  // the drag handler computes it from the pointer. Reduced motion resolves to the fully-drawn
  // resting state: all three points visible, highlight at the midpoint (agent).
  let root: HTMLElement;
  let track: HTMLElement;
  let ariaNow = $state(50);

  const types = [
    { name: "machine", cost: 0.2, reach: 0.25 },
    { name: "agent", cost: 0.5, reach: 0.55 },
    { name: "human", cost: 0.8, reach: 0.85 },
  ];

  function update(clientX: number): void {
    const rect = track.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    root.style.setProperty("--pos", pos.toFixed(4));
    ariaNow = Math.round(pos * 100);
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

<div class="verification" bind:this={root} style="--pos: 0.5">
  <div class="plot">
    <div class="grid"></div>
    {#each types as t (t.name)}
      <div
        class="point"
        style="left: {t.cost * 100}%; bottom: {t.reach * 100}%;"
      >
        <span class="point-label">{t.name}</span>
      </div>
    {/each}
    <div class="highlight"></div>
    <span class="axis-y">reach</span>
    <span class="axis-x">cost</span>
  </div>
  <div class="track" bind:this={track}>
    <div
      class="handle"
      role="slider"
      aria-label="cost"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={ariaNow}
      tabindex="0"
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
    ></div>
  </div>
  <p class="caption">cost against reach</p>
</div>

<style>
  .verification {
    --pos: 0.5;
    margin-top: 28px;
  }

  .plot {
    position: relative;
    height: 200px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 8px;
    overflow: hidden;
  }

  .grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 50% 50%;
    opacity: 0.5;
  }

  .point {
    position: absolute;
    width: 10px;
    height: 10px;
    background: var(--ink);
    border-radius: 50%;
    transform: translate(-50%, 50%);
  }

  .point-label {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--display);
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .highlight {
    position: absolute;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 35%, var(--surface-2));
    border: 2px solid var(--accent);
    left: calc(var(--pos) * 100%);
    bottom: calc((var(--pos) + 0.05) * 100%);
    transform: translate(-50%, 50%);
    transition: left 0.15s var(--ease-out), bottom 0.15s var(--ease-out);
    pointer-events: none;
  }

  .axis-y {
    position: absolute;
    left: 8px;
    top: 6px;
    font-family: var(--display);
    font-size: 12px;
    color: var(--text-muted);
  }

  .axis-x {
    position: absolute;
    right: 8px;
    bottom: 6px;
    font-family: var(--display);
    font-size: 12px;
    color: var(--text-muted);
  }

  .track {
    position: relative;
    height: 24px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .handle {
    position: absolute;
    top: -4px;
    bottom: -4px;
    left: calc(var(--pos) * 100%);
    transform: translateX(-50%);
    width: 24px;
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
    .highlight {
      transition: none;
    }
    .handle {
      transition: none;
    }
  }
</style>

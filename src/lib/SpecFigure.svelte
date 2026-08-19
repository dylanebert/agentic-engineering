<script lang="ts">
  // The example spec's sections, walked as the loop advances. Three cards — Goal, Stages,
  // Validation — drawn from the committed todo-spec.md, with a highlight on the section the loop's
  // current stage reads from: spec reads Goal, stage reads Stages, verify reads Validation. --pos
  // (0/0.5/1) drives the highlight, the same axis the loop figure uses, so the two figures are one
  // mechanism seen twice. The figure is mostly static — its claim is the section walk, not the
  // motion — so it is scrub-driven only (no auto-advance) and the gate holds a structural assertion
  // beside the variance read: the cards are strictly ordered, and the highlighted card is
  // perceptually distinguishable from the unhighlighted ones.
  import Scrub from "./Scrub.svelte";

  let root: HTMLElement;
  let pos = $state(0);

  const sections = [
    {
      name: "Goal",
      excerpt: "add, complete, edit, and delete items; the list persists across reloads",
    },
    {
      name: "Stages",
      excerpt:
        "four stages, each small enough to verify on its own, each in a fresh conversation",
    },
    {
      name: "Validation",
      excerpt: "each stage ships with a test that fails first and passes when it lands",
    },
  ];
  const POINTS = [0, 0.5, 1];

  function setPos(p: number): void {
    pos = Math.max(0, Math.min(1, p));
    root.style.setProperty("--pos", pos.toFixed(4));
  }
</script>

<div class="spec" bind:this={root} style="--pos: 0">
  <div class="cards">
    {#each sections as s, i (s.name)}
      <div class="card">
        <span class="card-stage">{["spec", "stage", "verify"][i]}</span>
        <span class="card-name">{s.name}</span>
        <span class="card-excerpt">{s.excerpt}</span>
      </div>
    {/each}
    <div class="highlight" aria-hidden="true"></div>
  </div>
  <Scrub pos={pos} onSetPos={setPos} points={POINTS} ariaLabel="spec section" />
  <p class="caption">the spec's sections, walked as the loop advances</p>
</div>

<style>
  .spec {
    --pos: 0;
    margin-top: 28px;
  }

  .cards {
    position: relative;
    display: grid;
    grid-template-rows: repeat(3, auto);
    gap: 4px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 4px;
  }

  .card {
    position: relative;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    z-index: 1;
  }

  .card-stage {
    font-family: var(--display);
    font-size: 10px;
    text-transform: lowercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .card-name {
    font-family: var(--display);
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }

  .card-excerpt {
    font-family: var(--serif);
    font-size: 14px;
    line-height: 1.45;
    color: var(--text-muted);
  }

  .highlight {
    position: absolute;
    left: 4px;
    right: 4px;
    /* 3 cards at centers 1/6, 1/2, 5/6 of the cards area; --pos 0/0.5/1 maps to those centers */
    top: calc((var(--pos, 0) * 0.6667 + 0.1667) * 100%);
    height: calc(33.333% - 4px);
    transform: translateY(-50%);
    background: color-mix(in srgb, var(--accent) 22%, var(--surface-2));
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    transition: top 0.25s var(--ease-out);
    z-index: 0;
    pointer-events: none;
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

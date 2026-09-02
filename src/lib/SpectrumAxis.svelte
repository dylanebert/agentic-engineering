<script lang="ts">
  // The spectrum figure: one axis with three named positions, drawn at rest. The claim it
  // carries is the lead-in paragraph's, quoted in src/lib/figures.ts: vibe coding at one end,
  // organic human code at the other, agentic engineering in the space between. Every label is
  // a word the section's own prose uses, so the figure asserts nothing the prose does not.
  //
  // The motion role is `emphasis`, and it carries the paragraph's point: the middle position is
  // the one the article argues for, so it is the one that moves. Across a cycle a rounded-rect
  // highlight comes up behind that position's mark and label; at the end of the cycle — which is
  // also the reduced-motion resting state — it is fully drawn. Every moving value is a CSS
  // function of `--phase` on the figure element (Figure.svelte), so the figure can be read at
  // any point of its cycle. The primitive is the shared rounded rectangle and every color comes
  // from a declared role in vocabulary.ts.

  import Figure from "./Figure.svelte";
  import { concepts } from "./vocabulary";

  // Positions left to right, in the order the axis arranges them. The ordered-geometry arm in
  // scripts/figures.spec.ts reads the rendered centers and requires this order.
  const positions = [
    { role: "vibe", label: concepts.vibe.label, x: 74, anchor: "middle" },
    { role: "agentic", label: concepts.agentic.label, x: 274, anchor: "middle" },
    { role: "prose", label: concepts.human.label, x: 474, anchor: "middle" },
  ] as const;
</script>

<Figure id="spectrum-axis" label="the spectrum, from vibe coding to human code">
  {#snippet children()}
    <svg class="axis" viewBox="0 0 548 116" role="presentation">
      <line class="rule" x1="74" y1="52" x2="474" y2="52" />
      {#each positions as position (position.role)}
        <g data-figure-part="position" data-role={position.role}>
          {#if position.role === "agentic"}
            <rect
              class="halo"
              data-figure-emphasis
              x={position.x - 80}
              y={30}
              width="160"
              height="64"
              rx="16"
            />
          {/if}
          <rect
            class="mark"
            data-role={position.role}
            x={position.x - 9}
            y={43}
            width="18"
            height="18"
            rx="5"
          />
          <text
            class="label"
            data-figure-label
            data-role={position.role}
            x={position.x}
            y={86}
            text-anchor={position.anchor}>{position.label}</text
          >
        </g>
      {/each}
    </svg>
  {/snippet}
</Figure>

<style>
  .axis {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .rule {
    stroke: var(--border);
    stroke-width: 1;
  }

  /* The emphasis role. It reads `--phase` (0 to 1 over the cycle, 1 at rest), holds the shared
     rounded-rectangle primitive, and carries no label, so the figure's asserted content is
     unchanged by the motion. */
  .halo {
    fill: var(--role-agentic);
    fill-opacity: 0.15;
    opacity: var(--phase, 1);
  }

  .mark {
    fill: var(--bg);
    stroke-width: 3;
  }

  .mark[data-role="vibe"] {
    stroke: var(--role-vibe);
  }

  .mark[data-role="agentic"] {
    stroke: var(--role-agentic);
    fill: color-mix(in srgb, var(--role-agentic) 12%, var(--bg));
  }

  .mark[data-role="prose"] {
    stroke: var(--role-prose);
  }

  .label {
    font-family: var(--sans);
    font-size: var(--label-font-size);
  }

  .label[data-role="vibe"] {
    fill: var(--role-vibe);
  }

  .label[data-role="agentic"] {
    fill: var(--role-agentic);
  }

  .label[data-role="prose"] {
    fill: var(--role-prose);
  }
</style>

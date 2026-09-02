<script lang="ts">
  // The loop figure: three nodes in the order the prose does them — spec, then stage, then
  // verify — and a return edge carrying the paragraph's own word for it, "repeat". Drawn at
  // rest; S4 advances a mark around it. Primitive and colors are the shared vocabulary's.

  import Figure from "./Figure.svelte";
  import { concepts } from "./vocabulary";

  // Left to right in the order the loop runs. The ordered-geometry arm reads these centers.
  const nodes = [
    { role: "agentic", label: concepts.spec.label, x: 14 },
    { role: "agentic", label: concepts.stage.label, x: 200 },
    { role: "verify", label: concepts.verify.label, x: 386 },
  ] as const;

  const width = 148;
  const height = 44;
  const top = 12;
</script>

<Figure id="stage-loop" label="the loop: spec, stage, verify, repeat">
  {#snippet children()}
    <svg class="loop" viewBox="0 0 548 132" role="presentation">
      <defs>
        <marker
          id="loop-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path class="head" d="M 0 0 L 8 4 L 0 8 z" />
        </marker>
      </defs>

      <line class="edge" x1={162} y1={top + height / 2} x2={192} y2={top + height / 2} />
      <line class="edge" x1={348} y1={top + height / 2} x2={378} y2={top + height / 2} />

      <path
        class="edge return"
        data-figure-part="return-edge"
        d="M 460 {top + height} L 460 100 L 88 100 L 88 {top + height}"
      />
      <text class="label" data-figure-label data-role="prose" x="274" y="122" text-anchor="middle"
        >repeat</text
      >

      {#each nodes as node, index (index)}
        <g data-figure-part="node" data-role={node.role}>
          <rect class="node" data-role={node.role} x={node.x} y={top} {width} {height} rx="8" />
          <text
            class="label"
            data-figure-label
            data-role={node.role}
            x={node.x + width / 2}
            y={top + height / 2 + 5}
            text-anchor="middle">{node.label}</text
          >
        </g>
      {/each}
    </svg>
  {/snippet}
</Figure>

<style>
  .loop {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .node {
    fill: var(--bg);
    stroke-width: 1;
  }

  .node[data-role="agentic"] {
    stroke: var(--role-agentic);
  }

  .node[data-role="verify"] {
    stroke: var(--role-verify);
  }

  .edge {
    fill: none;
    stroke: var(--role-prose);
    stroke-width: 1;
    marker-end: url(#loop-arrow);
  }

  .head {
    fill: var(--role-prose);
  }

  .label {
    font-family: var(--sans);
    font-size: var(--label-font-size);
  }

  .label[data-role="agentic"] {
    fill: var(--role-agentic);
  }

  .label[data-role="prose"] {
    fill: var(--role-prose);
  }

  .label[data-role="verify"] {
    fill: var(--role-verify);
  }
</style>

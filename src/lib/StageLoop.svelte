<script lang="ts">
  import Figure from "./Figure.svelte";
  import { concepts } from "./vocabulary";

  const nodes = [
    { role: concepts.spec.color, label: concepts.spec.label, x: 14, step: 0 },
    { role: concepts.stage.color, label: concepts.stage.label, x: 200, step: 1 },
    { role: concepts.verify.color, label: concepts.verify.label, x: 386, step: 2 },
  ] as const;

  const width = 148;
  const height = 44;
  const top = 12;
</script>

<Figure id="stage-loop" label="the loop: one spec, then stage and verify on repeat">
  {#snippet children()}
    <svg class="loop" viewBox="0 0 548 132" role="presentation">
      <defs>
        <marker id="loop-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path class="head" d="M 1 1 L 7 4 L 1 7" />
        </marker>
        <path id="unit-route" fill="none" d="M 88 34 L 274 34 L 460 34 L 460 100 L 274 100 L 274 56" />
      </defs>

      <line class="edge base" x1="162" y1={top + height / 2} x2="200" y2={top + height / 2} />
      <line class="edge base" x1="348" y1={top + height / 2} x2="386" y2={top + height / 2} />
      <path class="edge base" d="M 460 {top + height} L 460 100 L 274 100 L 274 {top + height}" />
      <path
        class="edge return"
        data-figure-part="return-edge"
        d="M 460 {top + height} L 460 100 L 274 100 L 274 {top + height}"
        pathLength="1"
        marker-end="url(#loop-arrow)"
      />
      <text class="label" data-figure-label data-role="prose" x="367" y="122" text-anchor="middle">repeat</text>

      {#each nodes as node (node.label)}
        <g data-figure-part="node" data-role={node.role}>
          <rect class="node" data-role={node.role} x={node.x} y={top} {width} {height} rx="8" />
          <rect
            class="emphasis"
            data-figure-emphasis
            data-node={node.label}
            data-role={node.role}
            style:--step={node.step}
            x={node.x}
            y={top}
            {width}
            {height}
            rx="8"
          />
          <text class="label" data-figure-label data-role={node.role} x={node.x + width / 2} y={top + height / 2 + 5} text-anchor="middle">{node.label}</text>
        </g>
      {/each}

      <circle class="unit" data-figure-part="unit" r="7" />
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

  .node,
  .emphasis,
  .unit,
  .edge,
  .head {
    fill: none;
  }

  .node {
    stroke-width: 1;
  }

  .node[data-role="agentic"], .emphasis[data-role="agentic"] { stroke: var(--role-agentic); }
  .node[data-role="context"], .emphasis[data-role="context"] { stroke: var(--role-context); }
  .node[data-role="verify"], .emphasis[data-role="verify"] { stroke: var(--role-verify); }

  .emphasis {
    stroke-width: 3;
    opacity: 0;
  }

  .emphasis[data-node="spec"] {
    opacity: clamp(0, calc(1 - var(--phase, 1) * 12), 1);
  }

  .emphasis[data-node="stage"] {
    opacity: max(
      clamp(0, calc(1 - abs(var(--phase, 1) - 0.2784) * 12), 1),
      clamp(0, calc(var(--phase, 1) * 12 - 11), 1)
    );
  }

  .emphasis[data-node="verify"] {
    opacity: clamp(0, calc(1 - abs(var(--phase, 1) - 0.5569) * 12), 1);
  }

  .edge {
    stroke: var(--role-prose);
    stroke-width: 1;
  }

  .head {
    stroke: var(--role-prose);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .return {
    stroke-width: 3;
    stroke-dasharray: 100px;
    stroke-dashoffset: clamp(0px, calc((1 - var(--phase, 1)) * 225.7px), 100px);
  }

  .unit {
    stroke: var(--role-agentic);
    stroke-width: 3;
    offset-path: url("#unit-route");
    offset-distance: calc((var(--phase, 1) - sin(var(--phase, 1) * 1080deg) * 0.018) * 100%);
    r: calc(7px * max(
      clamp(0, calc(1 - var(--phase, 1) * 18), 1),
      clamp(0, calc(1 - abs(var(--phase, 1) - 0.2784) * 32), 1),
      clamp(0, calc(1 - abs(var(--phase, 1) - 0.5569) * 32), 1),
      clamp(0, calc(1 - abs(var(--phase, 1) - 0.84) * 12), 1)
    ));
  }

  .label {
    font-family: var(--sans);
    font-size: var(--label-font-size);
  }

  .label[data-role="agentic"] { fill: var(--role-agentic); }
  .label[data-role="context"] { fill: var(--role-context); }
  .label[data-role="prose"] { fill: var(--role-prose); }
  .label[data-role="verify"] { fill: var(--role-verify); }
</style>

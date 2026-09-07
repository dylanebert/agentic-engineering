<script lang="ts">
  // The loop figure as a flow: spec → implement → verify in a row, with the return edge running
  // under verify back into implement. Same language as the hero: gray rails, filled shapes on top,
  // one dot that carries its destination's color and scales in and out at each station. Every
  // motion is a paused CSS animation driven by the figure's shared --phase, so it reads correctly
  // at any point of its 8 s cycle.
  import Figure from "./Figure.svelte";
  import { concepts } from "./vocabulary";

  const nodes = [
    { role: concepts.spec.color, label: concepts.spec.label, x: 14 },
    { role: concepts.stage.color, label: concepts.stage.label, x: 200 },
    { role: concepts.verify.color, label: concepts.verify.label, x: 386 },
  ] as const;
  const width = 148;
  const height = 44;
  const top = 12;
</script>

<Figure id="stage-loop" label="the loop: one spec, then implement and verify on repeat" loop={8000}>
  {#snippet children()}
    <svg class="loop" viewBox="0 0 548 120" role="presentation">
      <defs>
        <marker id="loop-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path class="head" d="M1 1L7 4L1 7" />
        </marker>
      </defs>
      <path class="rail" d="M162 34H196" marker-end="url(#loop-arrow)" />
      <path class="rail" d="M348 34H382" marker-end="url(#loop-arrow)" />
      <path class="rail" data-figure-part="return-edge" d="M460 56V100H274V60" marker-end="url(#loop-arrow)" />
      {#each nodes as node (node.label)}
        <g class="node" data-figure-part="node" data-node={node.label} data-role={node.role}>
          <rect x={node.x} y={top} {width} {height} rx="10" />
          <text data-figure-label x={node.x + width / 2} y={top + height / 2 + 5} text-anchor="middle">{node.label}</text>
        </g>
      {/each}
      <circle class="dot" data-figure-part="unit" cx="0" cy="0" r="0" />
    </svg>
  {/snippet}
</Figure>

<style>
  .loop { display: block; width: 100%; height: auto; overflow: visible; }
  .rail, .head { fill: none; stroke: var(--border); stroke-width: 2; vector-effect: non-scaling-stroke; }
  .head { stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  /* Two box states, outline and solid, switched by step animations: no tint, no fade. */
  .node rect { fill: var(--bg); stroke: currentColor; stroke-width: 1.5; }
  .node text { fill: currentColor; font-family: var(--mono); font-size: 14px; letter-spacing: .04em; }
  .node rect, .node text { animation: implement-rect 8s paused both; animation-delay: calc(-8s * var(--phase, 1)); }
  .node rect { animation-name: implement-rect; }
  .node text { animation-name: implement-text; }
  .node[data-node="spec"] rect { animation-name: spec-rect; }
  .node[data-node="spec"] text { animation-name: spec-text; }
  .node[data-node="verify"] rect { animation-name: verify-rect; }
  .node[data-node="verify"] text { animation-name: verify-text; }
  [data-role="context"] { color: var(--role-context); }
  [data-role="agentic"] { color: var(--role-agentic); }
  [data-role="verify"] { color: var(--role-verify); }
  /* The dot only ever travels the rails; inside a box it is gone and the box is solid instead.
     Its size animates through r, never scale: scale would also scale the offset translation. */
  .dot {
    stroke: none;
    offset-path: path("M162 34H196M348 34H382M460 56V100H274V60M348 34H382");
    animation: travel 8s paused both, dot-size 8s paused both, dot-ink 8s steps(1, end) paused both;
    animation-delay: calc(-8s * var(--phase, 1));
  }
  /* rail ends along the path: 9.14%, 18.28%, 90.86%, 100%. Beats (8 s): spec 0–4, rail 4–8,
     implement 8–22, rail 22–26, verify 26–40, return 40–52, implement 52–66, rail 66–70,
     verify 70–84, rest, spec again at 96. Box fades take 160 ms. */
  @keyframes travel {
    0%, 4% { offset-distance: 0%; animation-timing-function: cubic-bezier(.37,0,.63,1); }
    8%, 22% { offset-distance: 9.14%; animation-timing-function: cubic-bezier(.37,0,.63,1); }
    26%, 40% { offset-distance: 18.28%; animation-timing-function: cubic-bezier(.37,0,.63,1); }
    52%, 66% { offset-distance: 90.86%; animation-timing-function: cubic-bezier(.37,0,.63,1); }
    70%, 100% { offset-distance: 100%; }
  }
  @keyframes dot-size {
    0%, 4%, 8%, 22%, 26%, 40%, 52%, 66%, 70%, 100% { r: 0; }
    5%, 7%, 23%, 25%, 41%, 51%, 67%, 69% { r: 5; }
  }
  @keyframes dot-ink {
    0%, 21.99% { fill: var(--role-agentic); } 22%, 39.99% { fill: var(--role-verify); }
    40%, 65.99% { fill: var(--role-agentic); } 66%, 100% { fill: var(--role-verify); }
  }
  @keyframes spec-rect { 0%, 4% { fill: currentColor; animation-timing-function: cubic-bezier(.37,0,.63,1); } 6%, 96% { fill: var(--bg); animation-timing-function: cubic-bezier(.37,0,.63,1); } 98%, 100% { fill: currentColor; } }
  @keyframes spec-text { 0%, 4% { fill: var(--bg); animation-timing-function: cubic-bezier(.37,0,.63,1); } 6%, 96% { fill: currentColor; animation-timing-function: cubic-bezier(.37,0,.63,1); } 98%, 100% { fill: var(--bg); } }
  @keyframes implement-rect { 0%, 8%, 24%, 52%, 68%, 100% { fill: var(--bg); animation-timing-function: cubic-bezier(.37,0,.63,1); } 10%, 22%, 54%, 66% { fill: currentColor; animation-timing-function: cubic-bezier(.37,0,.63,1); } }
  @keyframes implement-text { 0%, 8%, 24%, 52%, 68%, 100% { fill: currentColor; animation-timing-function: cubic-bezier(.37,0,.63,1); } 10%, 22%, 54%, 66% { fill: var(--bg); animation-timing-function: cubic-bezier(.37,0,.63,1); } }
  @keyframes verify-rect { 0%, 26%, 42%, 70%, 86%, 100% { fill: var(--bg); animation-timing-function: cubic-bezier(.37,0,.63,1); } 28%, 40%, 72%, 84% { fill: currentColor; animation-timing-function: cubic-bezier(.37,0,.63,1); } }
  @keyframes verify-text { 0%, 26%, 42%, 70%, 86%, 100% { fill: currentColor; animation-timing-function: cubic-bezier(.37,0,.63,1); } 28%, 40%, 72%, 84% { fill: var(--bg); animation-timing-function: cubic-bezier(.37,0,.63,1); } }
  @media (prefers-reduced-motion: reduce) {
    .node, .node rect, .node text, .dot { animation: none; }
    .node[data-node="implement"] rect { fill: currentColor; }
    .node[data-node="implement"] text { fill: var(--bg); }
    .dot { r: 0; }
  }
</style>

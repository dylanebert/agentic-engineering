<script lang="ts">
  import { heroGrammar } from "./hero";

  const slides = [
    { scene: 1, slide: 1, label: "Scene 1 placeholder", caption: "Placeholder caption for scene 1, slide 1." },
    { scene: 1, slide: 2, label: "Scene 1 placeholder", caption: "Placeholder caption for scene 1, slide 2, with enough placeholder copy to occupy a second line." },
    { scene: 2, slide: 1, label: "Scene 2 placeholder", caption: "Placeholder caption for scene 2, slide 1." },
    { scene: 2, slide: 2, label: "Scene 2 placeholder", caption: "Placeholder caption for scene 2, slide 2." },
    { scene: 3, slide: 1, label: "Scene 3 placeholder", caption: "Placeholder caption for scene 3, slide 1." },
    { scene: 3, slide: 2, label: "Scene 3 placeholder", caption: "Placeholder caption for scene 3, slide 2." },
    { scene: 4, slide: 1, label: "Scene 4 placeholder", caption: "Placeholder caption for scene 4, slide 1." },
    { scene: 4, slide: 2, label: "Scene 4 placeholder", caption: "Placeholder caption for scene 4, slide 2." },
  ] as const;

  let index = $state(0);
  const current = $derived(slides[index]);

  function move(offset: number) {
    index = Math.min(slides.length - 1, Math.max(0, index + offset));
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  }
</script>

<figure class="hero" aria-labelledby="hero-title">
  <h2 id="hero-title" class="sr-only">Agentic engineering scene sequence</h2>

  <div
    class="stage"
    role="group"
    aria-label={`Scene ${current.scene}, slide ${current.slide}`}
    data-primitive-family={heroGrammar.primitiveFamily}
    data-thickness-roles={Object.keys(heroGrammar.thickness).join(" ")}
    data-color-roles={Object.keys(heroGrammar.colors).join(" ")}
    data-motion-roles={Object.keys(heroGrammar.motion).join(" ")}
  >
    {#each slides as item, itemIndex}
      <section
        class="slide"
        class:current={itemIndex === index}
        data-scene={item.scene}
        data-slide={item.slide}
        aria-hidden={itemIndex !== index}
      >
        <span>{item.label}</span>
      </section>
    {/each}
  </div>

  <div class="controls" aria-label="Sequence controls">
    <button type="button" onclick={() => move(-1)} onkeydown={onKeydown} disabled={index === 0} aria-label="Previous slide">←</button>
    <output aria-live="off">{index + 1} of {slides.length}</output>
    <button type="button" onclick={() => move(1)} onkeydown={onKeydown} disabled={index === slides.length - 1} aria-label="Next slide">→</button>
  </div>

  <figcaption aria-live="polite" aria-atomic="true" data-caption-index={index}>
    {current.caption}
  </figcaption>
</figure>

<style>
  .hero {
    --hero-active-step: var(--text);
    width: 100%;
    margin: 28px 0 0;
    outline-offset: 6px;
  }

  .stage {
    display: grid;
    width: 100%;
    aspect-ratio: 3 / 2;
    overflow: hidden;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }

  .slide {
    display: none;
    grid-area: 1 / 1;
    place-items: center;
    min-width: 0;
    padding: 24px;
    color: var(--text-muted);
    font-family: var(--display);
    font-size: var(--label-font-size);
    text-align: center;
  }

  .slide.current { display: grid; }

  figcaption {
    min-height: 3lh;
    padding-top: 12px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .controls {
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    gap: 12px;
  }

  button {
    min-width: 44px;
    min-height: 44px;
    border: 1px solid var(--border);
    border-radius: 0;
    color: var(--text);
    background: var(--bg);
    font: inherit;
    cursor: pointer;
  }

  button:disabled { cursor: default; opacity: 0.4; }
  output { color: var(--text-muted); text-align: center; font-variant-numeric: tabular-nums; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

  @media (prefers-reduced-motion: reduce) {
    .stage {
      height: auto;
      aspect-ratio: auto;
      grid-template-columns: repeat(2, 1fr);
    }

    .slide,
    .slide.current {
      display: grid;
      grid-area: auto;
      min-height: 120px;
      border: 1px solid var(--border);
    }

    .slide[aria-hidden="true"] { visibility: visible; }
  }
</style>

<script lang="ts">
  const steps = [
    {
      label: "ask",
      title: "Start with an outcome",
      body: "Give the agent a goal, not a pile of implementation decisions.",
      artifact: "make a todo app",
      kind: "prompt",
    },
    {
      label: "spec",
      title: "Turn the goal into a checkable plan",
      body: "Before code, split the work into stages with a clear meaning of done.",
      artifact: "1. add tasks\n2. complete tasks\n3. save and restore",
      kind: "document",
    },
    {
      label: "build",
      title: "Give one stage clean context",
      body: "A fresh agent receives the spec and implements only the next bounded stage.",
      artifact: "stage 1 / 3\n+ addTask(title)\n+ renders task list",
      kind: "diff",
    },
    {
      label: "verify",
      title: "Check before continuing",
      body: "Machines test the known rules, an agent hunts for gaps, and a person judges what has no cheaper oracle.",
      artifact: "✓ types and tests\n✓ independent review\n● human judgment",
      kind: "checks",
    },
    {
      label: "repeat",
      title: "Carry the spec, not the conversation",
      body: "Close the stage, update the durable plan, then start the next one with fresh context.",
      artifact: "stage 1 closed\ncontext cleared\nnext: complete tasks",
      kind: "loop",
    },
  ] as const;

  let active = $state(0);
  const step = $derived(steps[active]);

  function move(delta: number): void {
    active = Math.max(0, Math.min(steps.length - 1, active + delta));
  }
</script>

<section class="hero" aria-labelledby="walkthrough-title">
  <div class="intro">
    <p class="eyebrow">an interactive five-minute build</p>
    <h2 id="walkthrough-title">Direct the work. Check every step.</h2>
    <p>
      Build a tiny todo app without asking one conversation to understand,
      implement, and judge the whole thing.
    </p>
  </div>

  <div class="walkthrough">
    <div class="scene" data-kind={step.kind} aria-live="polite">
      <div class="orbit orbit-one" aria-hidden="true"></div>
      <div class="orbit orbit-two" aria-hidden="true"></div>
      <div class="agent" aria-hidden="true"><span></span></div>
      <div class="artifact">
        <span class="artifact-label">{step.label}</span>
        <pre>{step.artifact}</pre>
      </div>
      <div class="scene-caption">
        <span>{active + 1} / {steps.length}</span>
        <strong>{step.title}</strong>
        <p>{step.body}</p>
      </div>
    </div>

    <nav class="steps" aria-label="walkthrough steps">
      {#each steps as item, index}
        <button
          class:active={index === active}
          aria-current={index === active ? "step" : undefined}
          onclick={() => (active = index)}
        >
          <span>{index + 1}</span>{item.label}
        </button>
      {/each}
    </nav>

    <div class="controls">
      <button onclick={() => move(-1)} disabled={active === 0}>back</button>
      <button class="next" onclick={() => move(1)} disabled={active === steps.length - 1}>
        {active === steps.length - 1 ? "loop complete" : "next step"}
      </button>
    </div>
  </div>
</section>

<style>
  .hero {
    margin-top: 44px;
  }

  .intro {
    max-width: 620px;
    margin-bottom: 24px;
  }

  .eyebrow {
    margin: 0 0 10px;
    color: var(--accent);
    font-family: var(--display);
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 560px;
    font-family: var(--display);
    font-size: clamp(28px, 5vw, 48px);
    line-height: 1.04;
    letter-spacing: -0.04em;
  }

  .intro > p:last-child {
    max-width: 520px;
    margin-top: 14px;
    color: var(--text-muted);
  }

  .walkthrough {
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
    box-shadow: 0 24px 70px rgba(28, 39, 51, 0.1);
  }

  .scene {
    position: relative;
    min-height: 410px;
    overflow: hidden;
    border-radius: 10px;
    background: #101820;
    color: #f4f7f9;
    isolation: isolate;
  }

  .scene::before {
    position: absolute;
    inset: 0;
    z-index: -2;
    background:
      linear-gradient(rgba(132, 183, 205, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(132, 183, 205, 0.08) 1px, transparent 1px),
      radial-gradient(circle at 72% 30%, rgba(84, 164, 196, 0.22), transparent 36%);
    background-size: 32px 32px, 32px 32px, auto;
    content: "";
  }

  .orbit {
    position: absolute;
    border: 1px solid rgba(150, 205, 227, 0.3);
    border-radius: 50%;
  }

  .orbit-one {
    top: 55px;
    right: 9%;
    width: 220px;
    height: 220px;
  }

  .orbit-two {
    top: 95px;
    right: calc(9% + 40px);
    width: 140px;
    height: 140px;
  }

  .agent {
    position: absolute;
    top: 146px;
    right: calc(9% + 91px);
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #8fd3eb;
    box-shadow: 0 0 40px rgba(143, 211, 235, 0.55);
    transform: rotate(45deg);
  }

  .agent span {
    position: absolute;
    inset: 10px;
    border: 2px solid #101820;
    border-radius: 50%;
  }

  .artifact {
    position: absolute;
    top: 70px;
    left: 7%;
    width: min(52%, 390px);
    min-height: 186px;
    padding: 18px;
    border: 1px solid rgba(194, 225, 236, 0.24);
    border-radius: 8px;
    background: rgba(20, 31, 40, 0.92);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.32);
  }

  .artifact-label {
    color: #8fd3eb;
    font-family: var(--display);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  pre {
    margin-top: 32px;
    white-space: pre-wrap;
    color: #edf4f6;
    font: 500 14px/1.7 var(--mono);
  }

  .scene-caption {
    position: absolute;
    right: 24px;
    bottom: 22px;
    left: 24px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 3px 10px;
    align-items: baseline;
  }

  .scene-caption > span {
    grid-row: span 2;
    color: #8fd3eb;
    font: 600 12px var(--mono);
  }

  .scene-caption strong {
    font-family: var(--display);
    font-size: 18px;
  }

  .scene-caption p {
    max-width: 620px;
    color: #aec0c8;
    font-size: 14px;
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-top: 10px;
  }

  .steps button,
  .controls button {
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted);
    font: 600 12px var(--display);
    cursor: pointer;
  }

  .steps button {
    display: flex;
    gap: 7px;
    align-items: center;
    padding: 10px;
    text-align: left;
  }

  .steps button:hover,
  .steps button.active {
    background: var(--surface-2);
    color: var(--ink);
  }

  .steps button span {
    color: var(--accent);
    font-family: var(--mono);
  }

  .controls {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .controls button {
    padding: 9px 14px;
  }

  .controls button:hover:not(:disabled) {
    background: var(--surface-2);
    color: var(--ink);
  }

  .controls .next {
    background: var(--ink);
    color: white;
  }

  .controls .next:hover:not(:disabled) {
    background: var(--accent);
    color: white;
  }

  button:disabled {
    cursor: default;
    opacity: 0.35;
  }

  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    .scene {
      min-height: 460px;
    }

    .artifact {
      top: 44px;
      width: 78%;
    }

    .orbit-one {
      top: 170px;
      right: -70px;
    }

    .orbit-two {
      top: 210px;
      right: -30px;
    }

    .agent {
      top: 261px;
      right: 21px;
    }

    .steps {
      grid-template-columns: repeat(5, 1fr);
    }

    .steps button {
      justify-content: center;
      padding: 10px 4px;
      font-size: 0;
    }

    .steps button span {
      font-size: 12px;
    }
  }
</style>

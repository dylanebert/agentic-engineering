<script lang="ts">
  import SpectrumFigure from "./lib/SpectrumFigure.svelte";
</script>

<article class="page">
  <header class="head">
    <div class="meta">
      <a class="byline" href="https://dylanebert.com">dylan ebert</a>
      <span class="sep">·</span> august 2026
    </div>
    <h1 class="title">agentic engineering</h1>
    <p class="dek">for beginners</p>
  </header>

  <section class="section">
    <h2>agentic engineering</h2>
    <p>
      Agentic engineering is the practice of directing agents to make software
      and checking that what comes back is right. It's a practice you get better
      at.
    </p>
    <p>
      Everyone is still in the "just try things and see what happens" phase, but
      I've tried enough to be sure of one part: the hard part moved from writing
      the code to checking it.
    </p>
  </section>

  <section class="section">
    <h2>the spectrum</h2>
    <p>
      You may have heard of vibe coding. You tell an agent "make me some
      software," and software comes out. It might be good. It might be bad.
      It's probably purple, the color a
      model picks by default.
    </p>
    <p>
      That's one end of a spectrum. The other is 100% organic human code, every
      line written by hand. These aren't your only two options. The whole space
      between, where you stay in the loop, direct the work, and check each step,
      is where agentic engineering lives.
    </p>
    <SpectrumFigure />
  </section>

  <section class="section">
    <h2>verifiability</h2>
    <p>
      The first principle is verifiability: how well you can tell whether code
      does what you wanted. An agent wrote some code. Does it work? Is it fast?
      Is it secure? Is it how you want it to be? Those questions are the work.
    </p>
    <p>
      How well you can answer them is the task's verifiability, and it's the
      hard part. Everything else exists to raise it or hold its cost down. A
      loop catches errors early. A spec says what done means. A fresh
      conversation keeps the context clean.
    </p>
    <p>
      The
      <a href="/verifiability/">verifiability page</a>
      goes deeper on why checking is the bottleneck of development speed and
      what makes a proxy, a cheaper stand-in for a full review, worth trusting.
      The short version: you get two of scalability (how widely you can check),
      faithfulness (whether the check tracks what you want), and robustness
      (whether it holds under change), never three.
    </p>
  </section>

  <section class="section">
    <h2>context engineering</h2>
    <p>
      The second principle is context engineering: give an agent just enough
      context to complete a task, and no more than it needs. It sounds simple.
      The discipline is in the "no more."
    </p>
    <p>
      Too little and it guesses wrong. Too much and it loses the thread, or you
      pay for noise that drowns the signal. The unit of work is one task with
      the context it needs and nothing else. A fresh conversation per stage is
      how you hold the line.
    </p>
  </section>

  <section class="section">
    <h2>the worked example</h2>
    <p>
      Put the two together. "Make a todo list app." In the first conversation,
      don't implement anything. Write a spec breaking the work into stages,
      each one small enough to verify on its own.
    </p>
    <p>
      Then, in a new conversation, do the next stage of the spec. Verify the
      stage. If the check fails, fix it before moving on. Repeat, in a loop,
      until the spec is done. Verification closes each stage before the next
      opens, so errors stay in one stage rather than compounding across the
      whole build.
    </p>
    <p>
      The spec is what crosses between conversations. It holds the stages, what
      each one requires, and what done means, so a fresh conversation can pick
      up where the last left off.
    </p>
    <!-- Walkthrough figure placeholder — sized to hold the page's rhythm until the figure lands. -->
    <div class="placeholder" aria-label="walkthrough figure, to come">
      <span class="placeholder-label">walkthrough</span>
    </div>
  </section>

  <section class="section">
    <h2>the three verification types</h2>
    <p>
      So how exactly do you verify? No single kind of verification is enough;
      here it's a mix of three.
    </p>
    <p>
      Machine verification: typechecking and test suites. Fast, cheap,
      objective, and only as correct as the assumptions you fed them. They
      catch what you thought to check and miss what you didn't.
    </p>
    <p>
      Agent verification: another agent reviews the code. A fresh agent has no
      stake in what it wrote and is built to hunt for what's wrong. It scales
      with the diff in a way a person can't, covering more than a test suite
      but less than your own judgment.
    </p>
    <p>
      Human verification: your own feedback. The highest reach, how much of the
      system a check can cover, and the most expensive. Taste, your sense of
      what's good, lives here, because it has no cheaper proxy than you, and
      you can't sample a point of view in parallel.
    </p>
    <p>
      The three are priced by cost against reach. You spend machine
      verification freely, agent verification where it earns its keep, and human
      verification where nothing else can close the gap. The mix is the
      judgment call, and it shifts with what's at stake.
    </p>
  </section>

  <section class="section">
    <h2>going further</h2>
    <p>
      The practice is young and the principles are still moving, but the shape
      holds: a loop, a spec, and verification at every step. The rest is getting
      good at each one.
    </p>
    <p>
      For more, the
      <a href="/verifiability/">verifiability page</a>
      goes deeper on the hard part.
      <a href="/taste-loops/">Taste-loops</a>
      covers the part that isn't verifiable, where the only oracle, the final
      judge, is you and the loop has to run at interaction speed.
    </p>
    <p class="aside">
      check out the
      <a href="https://www.youtube.com/c/IndividualKex">video version</a>.
    </p>
  </section>
</article>

<style>
  .page {
    max-width: var(--measure);
    margin: 0 auto;
    padding: 96px 24px 120px;
  }

  .meta {
    font-family: var(--display);
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 14px;
  }

  .byline {
    color: var(--text-muted);
    text-decoration: none;
  }

  .byline:hover {
    color: var(--ink);
  }

  .sep {
    opacity: 0.5;
  }

  .title {
    font-family: var(--display);
    font-size: var(--title-font-size);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .dek {
    font-family: var(--display);
    font-size: 15px;
    color: var(--text-muted);
    margin-top: 10px;
  }

  .section {
    margin-top: 36px;
  }

  .section h2 {
    font-family: var(--display);
    font-size: var(--heading-font-size);
    font-weight: var(--heading-font-weight);
    text-transform: var(--heading-text-transform);
    color: var(--heading-color);
    background: var(--heading-bg);
    padding: var(--heading-padding);
    margin-bottom: var(--heading-margin-bottom);
  }

  .section p {
    margin-top: 12px;
    color: var(--text-dim);
  }

  .aside {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .placeholder {
    margin-top: 28px;
    height: 320px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: var(--surface-2);
    box-shadow: var(--bevel);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-label {
    font-family: var(--display);
    font-size: 14px;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }

  @media (max-width: 560px) {
    .page {
      padding: 56px 20px 80px;
    }

    .title {
      font-size: calc((1 - var(--snap2)) * 28px + var(--snap2) * 18px);
    }

    .placeholder {
      height: 240px;
    }
  }
</style>

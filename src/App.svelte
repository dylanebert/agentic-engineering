<script lang="ts">
  import SpectrumFigure from "./lib/SpectrumFigure.svelte";
</script>

<article class="page">
  <div class="masthead-blob" aria-hidden="true"></div>
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
      I've tried enough to be sure of one part: <strong>the hard part moved from
      writing the code to checking it.</strong>
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
    position: relative;
    z-index: 0;
    overflow-x: clip;
    max-width: var(--measure);
    margin: 0 auto;
    padding: 96px 24px 120px;
  }

  /* Blurred radial blob behind the masthead — a vibe-end decorative compositing surface (the
     spec's "blurred radial blob behind the masthead"). Opacity is driven by (1 - --snap1) so it
     is visible only at pos < 0.25 and transparent at kex/win98. overflow-x: clip on .page
     contains the blur's horizontal spread so the blob cannot cause horizontal overflow (criterion
     7's live hazard at pos=0). */
  .masthead-blob {
    position: absolute;
    top: -100px;
    left: 0;
    right: 0;
    height: 400px;
    background: radial-gradient(
      ellipse 60% 50% at 50% 50%,
      rgba(168, 85, 247, calc((1 - var(--snap1)) * 0.35)),
      transparent 70%
    );
    filter: blur(80px);
    pointer-events: none;
    z-index: -1;
  }

  /* Page header chrome — at kex (snap2=0) the header is bare (transparent bevel and
     background, no padding). At win98 (snap2=1) it reads as a raised window: outset bevel,
     white client-area ground, interior padding, and the h1 title bar with a control box. */
  .head {
    background: var(--section-bg);
    box-shadow: var(--chrome-bevel), var(--vibe-glow);
    border-radius: var(--radius);
    padding: var(--section-padding);
  }

  .meta {
    font-family: var(--display);
    font-size: var(--meta-font-size);
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
    font-weight: var(--heading-font-weight);
    letter-spacing: var(--heading-letter-spacing);
    text-transform: var(--heading-text-transform);
    color: color-mix(in srgb, #ffffff calc(var(--snap2) * 100%), var(--ink));
    background: var(--heading-bg);
    padding: var(--heading-padding);
    margin-bottom: var(--heading-margin-bottom);
  }

  .dek {
    font-family: var(--display);
    font-size: var(--dek-font-size);
    color: var(--text-muted);
    margin-top: 10px;
  }

  .section {
    margin-top: 52px;
    /* Three-way background: vibe glass surface (rgba(255,255,255,0.1)) at snap1=0, kex transparent,
     win98 opaque white at snap2=1. The vibe glow shadow is present at snap1=0 and transparent
     elsewhere. At kex (snap1=1, snap2=0) both are transparent, so no visual change. */
    background: var(--section-bg);
    box-shadow: var(--chrome-bevel), var(--vibe-glow);
    border-radius: var(--radius);
    padding: var(--section-padding);
  }

  .section h2 {
    font-family: var(--display);
    font-size: var(--heading-font-size);
    font-weight: var(--heading-font-weight);
    /* The h2's own tracking token — -0.025em at vibe, none at kex and win98 (matching 0eef6f6
       where the h2 had no letter-spacing). The .title (h1) keeps --heading-letter-spacing, which
       is -0.02em at kex — that value was present in 0eef6f6's .title and is unchanged here. */
    letter-spacing: var(--h2-letter-spacing);
    text-transform: var(--heading-text-transform);
    color: var(--heading-color);
    background: var(--heading-bg);
    padding: var(--heading-padding);
    margin-bottom: var(--heading-margin-bottom);
  }

  /* Win98 title-bar control box: the three right-side buttons (minimize, maximize, close)
     that make a title bar read as a window. Only visible at snap2=1 (transparent at kex). */
  .section h2::after,
  .title::after {
    content: "\2013  \25A1  \2715";
    float: right;
    margin-left: calc(var(--snap2) * 8px);
    font-size: calc(var(--snap2) * 9px);
    font-weight: 700;
    letter-spacing: 2px;
    opacity: var(--snap2);
    line-height: 1;
  }

  .section p {
    margin-top: 14px;
    color: var(--text-dim);
  }

  .aside {
    font-size: var(--aside-font-size);
    color: var(--text-muted);
  }

  .placeholder {
    margin-top: 28px;
    height: 320px;
    border: calc((1 - var(--snap2)) * 1px) dashed var(--border);
    border-radius: var(--radius);
    background: color-mix(in srgb, #ffffff calc(var(--snap2) * 100%), var(--surface-2));
    /* At kex (snap2=0): no bevel (chrome bevel tokens are transparent, so inert).
       At win98 (snap2=1): sunken inset bevel — dark (#808080) on top-left, light (#ffffff)
       on bottom-right — so the placeholder reads as a sunken field inside the window, not
       a hole punched through it. Dashed border is suppressed (not a win98 idiom). */
    box-shadow:
      inset -2px -2px var(--chrome-bevel-dark),
      inset 2px 2px var(--chrome-bevel-light);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-label {
    font-family: var(--display);
    font-size: var(--meta-font-size);
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }

  @media (max-width: 560px) {
    .page {
      padding: 56px 20px 80px;
    }

    .title {
      font-size: var(--title-font-size-sm);
    }

    .placeholder {
      height: 240px;
    }
  }
</style>

<script lang="ts">
  import SpectrumAxis from "./lib/SpectrumAxis.svelte";
  import StageLoop from "./lib/StageLoop.svelte";
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

  <section class="section" id="definition">
    <h2>agentic engineering</h2>
    <p>
      Agentic engineering is directing agents to make software. This page is the
      written version of my video on the subject, with the details and examples
      it had no room for. You say what you want, an agent writes the code, and
      you decide whether what came back is right.
    </p>
  </section>

  <section class="section" id="spectrum">
    <h2>the spectrum</h2>
    <p>
      One end of the spectrum is <span class="term" data-role="vibe">vibe coding</span>. You tell an agent "make me some
      software," and some software comes out. It might be good. It might be bad.
      And in my experience a model given no direction reaches for the same few
      colors, so it's probably purple.
    </p>
    <p>
      The other end is 100% <span class="term" data-role="prose">organic human code</span>,
      every line typed by a person. Those are not your only two options. A whole
      space sits between them, and <span class="term" data-role="agentic">agentic engineering</span> lives there: you direct
      the work, and you check each step.
    </p>

    <SpectrumAxis />
    <p>
      The space is wide. You can hand over a feature, a single function, or only
      the boilerplate around a design you already settled. Where you sit is a
      choice you make per task, not a stance you hold forever.
    </p>
  </section>

  <section class="section" id="verifiability">
    <h2>verifiability</h2>
    <p>
      Writing the code is no longer the hard part. An agent wrote some code.
      Does it work? Is it fast? Is it secure? Is it how you wanted it?
      <span class="term" data-role="verify">Verifiability</span> is how well you can answer those questions.
    </p>
    <p>
      Agentic engineering is young. Most of it is still "just try things and
      see what happens." Two principles have come up often enough that I'll
      claim them, and this is the first.
    </p>
    <p>
      The cost is lopsided. Writing a screen of code takes an agent seconds.
      Reading that screen closely enough to trust it takes you minutes. Give the
      agent more to do and your reading is the first thing to break, so most of
      the practice is about making the checking cheaper.
    </p>
    <p>
      I go further on a companion page,
      <a href="/verifiability/">verifiability</a>. It covers why checking sets
      the pace of development, and when a cheap check is worth trusting in place
      of an expensive one: a test suite, say, instead of reading the diff.
    </p>
  </section>

  <section class="section" id="context-engineering">
    <h2>context engineering</h2>
    <p>
      The second principle is <span class="term" data-role="context">context engineering</span>: give an agent just enough
      context to complete a task, and no more than that. It sounds like a
      platitude. The discipline is in the second half.
    </p>
    <p>
      Too little context and the agent guesses, confidently. Too much and the
      task sits buried under things it shouldn't be reading. A long
      conversation is the usual way to get too much: deep into one, much of
      what the agent can see is its own abandoned attempts.
    </p>
    <p>
      So the unit of work is one task plus the context for that task. A fresh
      conversation per unit is how you hold the line, and it is why the next
      section starts by writing something down.
    </p>
  </section>

  <section class="section" id="loop">
    <h2>the loop</h2>
    <p>
      Put the two principles together. Say the job is a todo list app. In the
      first conversation, don't implement anything. Write a <span class="term" data-role="context">spec</span> instead: what
      the thing is, and how the work breaks into stages small enough to check
      one at a time.
    </p>
    <p>
      Then open a new conversation and do the next stage of the spec. Verify
      that stage. If the check fails, fix it before you go on. Then repeat, in a
      loop, until the spec is done.
    </p>

    <StageLoop />
    <p>
      The spec is the thing crossing between conversations. It carries the
      stages, what each stage needs, and what done means, so a fresh
      conversation picks up cold. The stage boundary is where errors stop too: a
      mistake caught at stage three doesn't become the floor for stage four.
    </p>
  </section>

  <section class="section" id="verification">
    <h2>how you verify</h2>
    <p>
      The word doing the work in that loop is "verify." In practice it is a mix
      of three kinds of checking, and each one reaches somewhere the others
      don't.
    </p>
    <ul class="kinds">
      <li>
        <strong>Machine verification.</strong> Typechecking and test suites.
        Fast, cheap, and the same answer every run. They catch what you thought
        to check.
      </li>
      <li>
        <strong>Agent verification.</strong> A second agent reads the code. It
        has no stake in having written it, and it will read more of the diff
        than you have patience for.
      </li>
      <li>
        <strong>Human verification.</strong> Your own feedback. The slowest and
        most expensive, and still the last word on whether the thing is any
        good.
      </li>
    </ul>
    <p>
      Machine checks run on every save. Agent review runs at the end of a stage.
      My own reading runs where the other two can't reach. Picking the mix is
      the judgment call, and
      <a href="/verifiability/">the verifiability page</a>
      is where I work out how far the cheap ones can be pushed.
    </p>
  </section>

  <section class="section" id="closing">
    <h2>in practice</h2>
    <p>
      In practice, <span class="term" data-role="agentic">agentic engineering</span> is a spec, small stages, a fresh
      conversation for each, and a check before the next one opens.
    </p>
    <p>
      The weak point is the spec. Everything downstream inherits it, and a spec
      that is wrong just gets built correctly, stage by stage, with every check
      passing. Writing it is still the part I do by hand. The details keep
      moving; spec, then stages, then a check on each has held so far.
    </p>
    <p>
      A second companion page,
      <a href="/taste-loops/">taste-loops</a>, is about the loops where taste is
      the check. It covers the part you can't hand to a machine or a second
      agent: the final judge is you, so the checking has to be fast enough that
      you keep doing it.
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
    font-size: var(--meta-font-size);
    font-weight: var(--display-font-weight);
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
    color: var(--ink);
    background: var(--heading-bg);
    padding: var(--heading-padding);
    margin-bottom: var(--heading-margin-bottom);
  }

  .dek {
    font-family: var(--display);
    font-size: var(--dek-font-size);
    font-weight: var(--display-font-weight);
    color: var(--text-muted);
    margin-top: 10px;
  }

  .section {
    margin-top: var(--section-margin-top);
  }

  .section h2 {
    font-family: var(--display);
    font-size: var(--heading-font-size);
    font-weight: var(--heading-font-weight);
    letter-spacing: var(--h2-letter-spacing);
    text-transform: var(--heading-text-transform);
    color: var(--heading-color);
    background: var(--heading-bg);
    padding: var(--heading-padding);
    margin-bottom: var(--heading-margin-bottom);
  }

  .section p {
    margin-top: var(--paragraph-margin-top);
    color: var(--text-dim);
  }

  /* Color roles bound to the prose (src/lib/vocabulary.ts). A term the page names as a concept
     carries the same role its figure part carries, so the two readings are one vocabulary; the
     span changes color only, so the rendered text and its measure are untouched. */
  .term[data-role="vibe"] {
    color: var(--role-vibe);
  }

  .term[data-role="agentic"] {
    color: var(--role-agentic);
  }

  .term[data-role="verify"] {
    color: var(--role-verify);
  }

  .term[data-role="context"] {
    color: var(--role-context);
  }

  .term[data-role="prose"] {
    color: var(--role-prose);
  }

  .kinds {
    margin-top: var(--paragraph-margin-top);
    padding-left: 1.5em;
    color: var(--text-dim);
  }

  .kinds li {
    margin-top: 10px;
  }

  .aside {
    font-size: var(--aside-font-size);
    color: var(--text-muted);
  }

  @media (max-width: 560px) {
    .page {
      padding: 56px 20px 80px;
    }

    .title {
      font-size: var(--title-font-size-sm);
    }
  }
</style>

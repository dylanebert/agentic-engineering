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
  </header>

  <section class="section" id="definition">
    <p>Agentic engineering is directing agents to make software.</p>
  </section>

  <section class="section" id="spectrum">
    <h2>the spectrum</h2>
    <p>Two ends bracket the work. The interesting ground sits between them.</p>

    <h3 class="point" data-role="vibe">vibe coding</h3>
    <p>
      One end is <span class="term" data-role="vibe">vibe coding</span>. Tell an agent "make me
      some software," and software comes out. It might be good. It might be bad. And it's probably
      <span class="term" data-role="vibe">purple</span>: a model given no direction reaches for the
      same few defaults every time.
    </p>

    <h3 class="point" data-role="prose">human code</h3>
    <p>
      The other end is <span class="term" data-role="prose">human code</span>, every line typed by
      a person. Slower per line, and the intent behind each one is known. For work where the design
      is the hard part and the typing is incidental, it stays the right trade.
    </p>

    <h3 class="point" data-role="agentic">agentic engineering</h3>
    <p>
      Those are not the only two options. Between vibe coding and human code is a whole space, and
      <span class="term" data-role="agentic">agentic engineering</span> lives there: the work is
      directed, and every step is checked.
    </p>

    <SpectrumAxis />
  </section>

  <section class="section" id="principles">
    <h2>principles</h2>
    <p>
      The practice is young. Most of it is still just trying things and seeing what happens, but
      enough things have been tried to name two principles.
    </p>

    <section class="principle" id="verifiability">
      <h3>1. verifiability</h3>
      <p>
        Writing code is no longer the hard part. An agent wrote some code. But does it work? Is it
        fast? Is it secure? Is it what was asked for?
        <span class="term" data-role="verify">Verifiability</span> is how well those questions can
        be answered, and it is the hard part.
      </p>
      <p>
        A companion page, <a href="/verifiability/">verifiability</a>, goes further: why checking
        sets the pace of development, and when a cheap check can stand in for an expensive one.
      </p>
    </section>

    <section class="principle" id="context-engineering">
      <h3>2. context engineering</h3>
      <p>
        <span class="term" data-role="context">Context engineering</span> is giving an agent just
        enough context to complete a task, and no more. Too little and it guesses, confidently. Too
        much and the task sits buried under everything else in the window.
      </p>
      <p>
        A long conversation is the usual way to get too much. Deep into one, much of what the agent
        can see is its own abandoned attempts. So the unit of work is one task plus its context, and
        each unit gets a fresh conversation.
      </p>
    </section>
  </section>

  <section class="section" id="loop">
    <h2>the loop</h2>
    <p>
      Put the two principles together. Say the job is a todo list app. The first conversation writes
      no code: it produces a <span class="term" data-role="context">spec</span>, one file naming
      what the thing is and how the work splits into stages small enough to check one at a time.
    </p>
    <p>
      Each stage then gets its own conversation. Do the stage, verify the stage, fix any failure
      before moving on. Then repeat: stage, verify, stage again, until the spec is done.
    </p>

    <StageLoop />
    <p>
      The spec is the one thing crossing between conversations. It carries the stages, what each
      stage needs, and what done means, so a cold conversation can pick the work up. Stage
      boundaries also stop errors: a mistake caught at stage three does not become the floor for
      stage four.
    </p>
  </section>

  <section class="section" id="verification">
    <h2>how do you verify?</h2>
    <p>
      The hard part of the loop is verifying. In practice it is three kinds of checking, and each
      kind reaches somewhere the other two do not.
    </p>
    <ul class="kinds">
      <li>
        <strong>Machine verification.</strong> Typechecking and test suites. Fast, cheap, the same
        answer every run. They catch what the checks were written to catch.
      </li>
      <li>
        <strong>Agent verification.</strong> A second agent reads the code. It has no stake in
        having written it, and it will read the whole diff without getting bored.
      </li>
      <li>
        <strong>Human verification.</strong> My own feedback. Slowest, most expensive, and still
        the last word on whether the thing is any good.
      </li>
    </ul>
    <p>
      Machine checks run on every save. Agent review runs at the end of a stage. My own reading runs
      where the other two cannot reach, and picking the mix is the judgment call.
    </p>
  </section>

  <section class="section" id="closing">
    <h2>in practice</h2>
    <p>
      One spec, small stages, a fresh conversation for each, and a check before the next one opens.
      Verifiability is why the check comes first; context engineering is why the conversation is
      fresh.
    </p>
    <p>
      The application of these principles is
      <span class="term" data-role="agentic">agentic engineering</span>. My own habits keep moving,
      and this loop is the part holding steady so far.
    </p>
    <p class="aside">
      This page is the written version of my
      <a href="https://www.youtube.com/c/IndividualKex">video</a> on the subject,<br /> with the details
      and examples it had no room for.
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

  /* The second heading tier: the spectrum's three points and the two numbered principles. Same
     display family, weight and lowercase register as h2, one step down in size, so the page gains
     a tier without a new type identity (spec Out of scope: the type and measure stay as shipped). */
  .section h3 {
    font-family: var(--display);
    font-size: var(--body-font-size);
    font-weight: var(--heading-font-weight);
    letter-spacing: var(--h2-letter-spacing);
    text-transform: var(--heading-text-transform);
    color: var(--heading-color);
    margin-top: 26px;
    margin-bottom: 2px;
  }

  /* A spectrum point's heading carries the same role color its prose span and its figure part
     carry (src/lib/vocabulary.ts), which is what makes the block structure read as the page's
     one vocabulary. The role's *prose* binding is still the span inside the paragraph: the
     rendered-tree arm reads `.term[data-role]` inside p and li only, so a heading can never
     satisfy the binding on its own. */
  .point[data-role="vibe"] {
    color: var(--role-vibe);
  }

  .point[data-role="agentic"] {
    color: var(--role-agentic);
  }

  .point[data-role="prose"] {
    color: var(--role-prose);
  }

  /* The two principles are subsections of one section, not sections of their own: they carry the
     beats the manuscript numbers, and the manifest declares them at subsection level. */
  .principle {
    margin-top: 26px;
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

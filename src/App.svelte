<script lang="ts">
  import Overture from "./lib/Overture.svelte";
  import StageLoop from "./lib/StageLoop.svelte";
</script>

<article class="page">
  <header class="head">
    <div class="meta">
      <a class="byline" href="https://dylanebert.com">dylan ebert</a>
      <span class="sep">·</span> september 2026
    </div>
    <h1 class="title">agentic engineering</h1>
    <p class="subtitle">for beginners</p>
  </header>

  <Overture />

  <section class="section" id="spectrum">
    <h2>the spectrum</h2>
    <p>
      <span class="term" data-role="vibe">Vibe coding</span> sits at one end of the spectrum. Tell
      an agent "make me some software," and some software comes out. It might be good. It might be
      bad. And it's probably <span class="term" data-role="vibe">purple</span>. This is a bit like a
      software slot machine.
    </p>

    <p>
      On the other end of the spectrum is <span class="term" data-role="prose">human code</span>,
      written manually. This gives full control and has the highest ceiling of quality, but is slow.
    </p>

    <p>
      There's a third option.
      <span class="term" data-role="agentic">Agentic engineering</span> lives in the spectrum in
      between: directing agents intentionally to build and verify software.
    </p>
  </section>

  <section class="section" id="principles">
    <h2>principles of agentic engineering</h2>
    <p>
      We're still in the early stages of agents. Best practices change rapidly. Two principles have
      been converged on:
    </p>

    <section class="principle" id="verifiability">
      <h3>1. verifiability</h3>
      <p>
        An agent wrote some code. But does it work? Is it fast? Is it secure? Does it do what you
        want it to do? That's <span class="term" data-role="verify">verifiability</span>, and it's
        the hard part.
      </p>
    </section>

    <section class="principle" id="context-engineering">
      <h3>2. context engineering</h3>
      <p>
        Give an agent just enough <span class="term" data-role="context">context</span> to complete
        a task, and no more. Break the work into stages, and give each stage its own conversation.
      </p>
    </section>
  </section>

  <section class="section" id="loop">
    <h2>the loop</h2>
    <p>
      Let's put these principles together. Suppose we want an agent to make a todo list app. In the
      first conversation, implement nothing. Instead, tell the agent to write a
      <span class="term" data-role="context">spec</span>: a file describing the work that needs to
      be done, broken into stages.
    </p>
    <p>
      Then <span class="term" data-role="agentic">implement</span> one stage in a fresh
      conversation, and <span class="term" data-role="verify">verify</span> it before the next
      conversation opens. Repeat: implement the next stage, verify again, until the spec is done.
    </p>

    <StageLoop />
    <p>
      The spec holds context across conversations, while each conversation is small and focused.
      The crux of this loop is verification.
    </p>
  </section>

  <section class="section" id="verification">
    <h2>how do you verify?</h2>
    <p>
      An agent implemented a stage, but how do you trust what it implemented? The answer is
      verification, and there are three types:
    </p>
    <ol class="kinds">
      <li>
        <strong>Human verification.</strong> Reading the code. This is the highest ceiling, but
        also slow and expensive.
      </li>
      <li>
        <strong>Machine verification.</strong> Code verifying code, e.g. test suites. This is fast
        and efficient, but relies on correct assumptions.
      </li>
      <li>
        <strong>Agent verification.</strong> Tell another agent: "this code is wrong. explain why."
      </li>
    </ol>
    <p>
      Exactly how and when to use each isn't a recipe, but a whole domain. That's
      <span class="term" data-role="agentic">agentic engineering</span>.
    </p>
  </section>

  <footer class="foot">
    <p class="aside">
      Check out the <a href="https://www.youtube.com/watch?v=CLLp3ey-9VI">video version</a>.
    </p>
  </footer>
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

  .subtitle {
    margin: 6px 0 0;
    font-family: var(--display);
    font-size: 1.05rem;
    font-weight: 400;
    letter-spacing: 0.01em;
    color: var(--text-muted);
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

  /* The numbered principles use the display family one step down from their parent heading, so
     the page gains a tier without a new type identity (spec Out of scope: type and measure stay). */
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

  /* The two principles are subsections of one section, not sections of their own: they carry the
     beats the manuscript numbers, and the manifest declares them at subsection level. */
  .principle {
    margin-top: 26px;
  }

  .section p {
    margin-top: var(--paragraph-margin-top);
    color: var(--text-dim);
  }

  #spectrum p {
    margin-top: 10px;
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

  .foot {
    margin-top: var(--section-margin-top);
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }

  .foot .aside {
    margin: 0;
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

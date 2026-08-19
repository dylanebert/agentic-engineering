<article class="page">
  <header class="head">
    <div class="meta">
      <a class="byline" href="https://dylanebert.com">dylan ebert</a>
      <span class="sep">·</span> august 2026
    </div>
    <h1 class="title">agentic engineering</h1>
    <p class="dek">the written version of the video script</p>
  </header>

  <section class="section">
    <h2>agentic engineering</h2>
    <p>
      Agentic engineering is the practice of directing agents to make software.
      The name covers how you work, not a tool you buy, and it's a practice you
      get better at.
    </p>
    <p>
      We're still in the "just try things and see what happens" phase of this.
      I've tried enough things to be sure of one part: the hard part moved.
      Generating code is easy now. Knowing whether it's the code you want is
      not, and the gap is where the work is.
    </p>
  </section>

  <section class="section">
    <h2>the spectrum</h2>
    <p>
      You may have heard of vibe coding. You tell an agent "make me some
      software," and software comes out. It might be good. It might be bad.
      It's probably purple.
    </p>
    <p>
      That's one end of a spectrum. The other is 100% organic human code, every
      line written by hand. These aren't your only two options. The whole space
      between, where you stay in the loop, direct the work, and check each step,
      is where agentic engineering lives.
    </p>
    <div class="fig"></div>
  </section>

  <section class="section">
    <h2>verifiability</h2>
    <p>
      An agent wrote some code. That's the easy part now. Does it work? Is it
      fast? Is it secure? Is it how you want it to be? Those questions are the
      work.
    </p>
    <p>
      How well you can answer them is the task's verifiability, and it's the
      hard part. It's the first principle. Everything else exists to raise it.
      A loop catches errors early. A spec says what done means. A fresh
      conversation keeps the context clean.
    </p>
    <p>
      The
      <a href="/verifiability/">verifiability page</a>
      goes deeper on why checking is the bottleneck of development speed and
      what makes a proxy worth trusting. The short version: you get two of
      scalability, faithfulness, and robustness, never three.
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
      stage. Repeat, in a loop, until the spec is done. Each pass is a clean
      context and a single, checkable piece of work.
    </p>
    <div class="fig"></div>
    <p>
      Each stage is one task with bounded context. The spec carries what came
      before, so the agent doesn't rebuild it from a thread that has drifted.
      Verification closes each stage before the next one opens, so errors
      compound across a stage instead of across the whole build.
    </p>
    <div class="fig"></div>
  </section>

  <section class="section">
    <h2>the three verification types</h2>
    <p>
      The basics, then. The hard part is how exactly you verify, and the
      answer: no single kind of verification is enough. Here it's a mix of
      three.
    </p>
    <p>
      Machine verification: typechecking and test suites. Fast, cheap,
      objective, and only as correct as the assumptions you fed them. They
      catch what you thought to check and miss what you didn't.
    </p>
    <p>
      Agent verification: another agent reviews the code. A fresh agent has no
      stake in what it wrote and is built to hunt for what's wrong. It scales
      with the diff in a way a person can't.
    </p>
    <p>
      Human verification: your own feedback. The highest reach, and the most
      expensive. Taste lives here, because taste has no cheaper proxy than the
      person who holds it, and you can't sample a point of view in parallel.
    </p>
    <div class="fig"></div>
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
      The application of these principles is agentic engineering. The practice
      is young and the principles are still moving, but the shape holds: a loop,
      a spec, and verification at every step. The rest is getting good at each
      one.
    </p>
    <p>
      For more, the
      <a href="/verifiability/">verifiability page</a>
      goes deeper on the hard part.
      <a href="/taste-loops/">Taste-loops</a>
      covers the part that isn't verifiable, where the only oracle is you and
      the loop has to run at interaction speed.
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
    font-size: 34px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .dek {
    font-family: var(--display);
    font-size: 16px;
    color: var(--text-muted);
    margin-top: 10px;
  }

  .section {
    margin-top: 40px;
  }

  .section h2 {
    font-family: var(--display);
    font-size: 15px;
    font-weight: 600;
    text-transform: lowercase;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .section p {
    margin-top: 14px;
    color: var(--text-dim);
  }

  .aside {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .fig {
    min-height: 200px;
    margin: 28px 0 0;
    border: 1px dashed var(--border);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-family: var(--display);
    font-size: 13px;
  }

  .fig::before {
    content: "figure";
    text-transform: lowercase;
    letter-spacing: 0.04em;
  }

  @media (max-width: 560px) {
    .page {
      padding: 56px 20px 80px;
    }

    .title {
      font-size: 28px;
    }
  }
</style>

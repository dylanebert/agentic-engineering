<script lang="ts">
  import HeroWalkthrough from "./lib/HeroWalkthrough.svelte";
</script>

<article class="page">
  <header class="head">
    <div class="meta">
      <a href="https://dylanebert.com">dylan ebert</a>
      <span>·</span> august 2026
    </div>
    <h1>agentic engineering</h1>
    <p class="dek">for beginners</p>
  </header>

  <HeroWalkthrough />

  <main>
    <section>
      <span class="section-number">01</span>
      <h2>direct, don't disappear</h2>
      <p>
        Agentic engineering is the practice of directing agents to make
        software and checking that what comes back is right. The useful space
        isn't a gimmicky line between vibe coding and hand-written code. It's
        the loop you stay inside.
      </p>
      <p>
        The hero walks that whole loop once. The rest of this post will slow it
        down and explain why each handoff exists.
      </p>
    </section>

    <section>
      <span class="section-number">02</span>
      <h2>make the work verifiable</h2>
      <p>
        Verifiability is how well you can tell whether the result is what you
        wanted. A spec gives the result edges. Bounded stages keep mistakes
        local. Machine checks, independent agent review, and human judgment
        each cover a different part of the answer.
      </p>
      <figure class="snapshot">
        <div class="code-lines" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </div>
        <figcaption>hero still: the verification pass</figcaption>
      </figure>
    </section>

    <section>
      <span class="section-number">03</span>
      <h2>carry context on purpose</h2>
      <p>
        Too little context makes an agent guess. Too much makes it lose the
        thread. Give one stage the material it needs, let the durable spec hold
        what crosses stages, and start the next conversation clean.
      </p>
      <figure class="snapshot text-snapshot">
        <pre>stage 1 closed
context cleared
next: complete tasks</pre>
        <figcaption>code snapshot: what survives the conversation</figcaption>
      </figure>
    </section>

    <section>
      <span class="section-number">04</span>
      <h2>repeat</h2>
      <p>
        The shape is simple: write down what done means, give an agent one
        bounded stage, verify it, and repeat with fresh context. The practice
        is getting good at the handoffs and knowing which check can actually
        see the thing you care about.
      </p>
      <p>
        The <a href="/verifiability/">verifiability page</a> goes deeper on
        checking. <a href="/taste-loops/">Taste-loops</a> covers the work whose
        only final judge is you.
      </p>
    </section>
  </main>
</article>

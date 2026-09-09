<script lang="ts">
  const record = "https://raw.githubusercontent.com/dylanebert/agentic-engineering/df8bb95e59ce3116c259a8ccaef1b5a9eb4aed25/examples/note-persistence/";
</script>

<div class="note-example">
  <iframe title="Try the note with saving" src="/agentic-engineering/note.html"></iframe>
  <p>
    <a href="/agentic-engineering/note.html" data-note-direct>Open the note on its own</a>.
    It saves only in this browser at this address, not to an account or another device.
    This barebones page isn't the final design.
  </p>
  <p>
    A setup agent supplied the starter, request and browser-test setup. One agent wrote the spec;
    a fresh conversation wrote the tests and saving code, with supplied instructions to run them.
    This is the saved result, not a live model call.
  </p>
  <details data-note-detail>
    <summary>Source and full record</summary>
    <ul>
      <li><a href={record + "starter/app/index.html"} data-note-source="starter">Starter source</a>, <a href={record + "final/app/index.html"} data-note-source="final">saved source</a> and <a href={record + "final/tests/note.spec.ts"}>tests</a>.</li>
      <li><a href={record + "final/SPEC.md"}>Exact spec</a> and <a href={record + "detail.md"}>prompts and assistance</a>.</li>
      <li><a href={record + "detail.md"} data-note-record>Complete record</a>: setup, browser results, logs, usage, costs and limits.</li>
      <li><a href={record + "REPLAY.md"}>Run the saved checks</a> without a model.</li>
    </ul>
    <p>
      This run followed a separate, exhausted three-attempt campaign. Its qualifications remain in
      the <a href={record + "detail.md"}>old record</a>.
      Both standalone explanations of this new run were rejected; confirming the note works
      didn't accept the explanation. These records don't rank models or prove another agent
      will reproduce the result.
    </p>
  </details>
</div>

<style>
  .note-example { margin-top: var(--paragraph-margin-top); }
  iframe { display: block; width: 100%; height: 300px; border: 1px solid currentColor; box-sizing: border-box; }
  p, details { margin-top: var(--paragraph-margin-top); color: var(--text-dim); }
  ul { padding-left: 1.5em; }
  li { margin-top: 10px; }
  summary { cursor: pointer; }
</style>

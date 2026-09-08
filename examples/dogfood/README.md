# Saved-Note Experiment: Pilot Record

One pilot has run. Its two implementation stages passed the recorded browser actions. No adjustment, clean replay, independent size decision or finished reader walkthrough has happened. This is an unfinished experiment record, not a demonstrated public-provider recipe.

## Read the Record

- [Reader inputs](reader/README.md): supplied setup, request, stage prompts and manual checks. Start a repeat from these files, never the completed snapshots.
- [Frozen initial inventory and snapshots](corpus/index.json): SHA-256 bindings at conversation boundaries.
- [Spec conversation](corpus/pilot/spec/session.jsonl), [first stage](corpus/pilot/stage-one/session.jsonl), [second stage](corpus/pilot/stage-two/session.jsonl): stock Pi session entries with IDs, prompts, tool arguments/results and final-message usage. Each directory also contains the stock event stream and process exit/timing receipts.
- [First-stage browser observations](corpus/pilot/stage-one/browser/observations.json) and [second-stage observations](corpus/pilot/stage-two/browser/observations.json): actual actions, values, timestamps, source hashes and teardown. Screenshots sit alongside these records.
- [Unaltered final files](corpus/pilot/snapshots/stage-two/): the subject's output, not supplied reader scaffolding.
- [Counts and time](corpus/pilot/summary.json), [coordinator transitions](corpus/pilot/transitions.jsonl), [redaction ledger](corpus/redactions.json).

The model wrote SPEC.md (`spec/session.jsonl`, entry `1a573768`), created index.html (`stage-one/session.jsonl`, `6c0029ec`), then added persistence (`stage-two/session.jsonl`, `b9721ecf`). The coordinator supplied prompts and checks but did not change those files. There were no corrective follow-ups or failed subject tool calls. Deliberately broken observer controls are separate from the pilot and must not be narrated as agent bugs.

## A Protocol Deviation

In the second-stage session, entry `376ee6cf` runs `wc -l records/*.jsonl`. That command accessed previous transcript bytes and returned line counts and filenames, although the prompt said not to read prior conversations. No prior transcript text or solution content appears in its tool output. The model's final claim that it did not read transcripts is therefore too broad. This observation needs the independent decision before a clean replay; do not describe this pilot as proving strict transcript isolation.

The subject also listed config, record and installed-tool filenames. It did not read credential contents or outside project code in the retained calls. An external folder, empty HOME and tool allowlist are not an OS sandbox. The corpus records observable tool behavior, not hidden provider internals or a containment guarantee.

## What the Checks Establish

The pilot used Pi 0.85.1 with gateway DeepSeek V4 Flash 0731 at max, Bun 1.4.0, Node 26.7.0 and Chromium 151.0.7922.34. There were three fresh conversations, 20 model requests, 26 tool calls and 84.03 seconds of subject-process wall time. Final assistant messages report 92,167 input and 6,329 output tokens, 98,496 total, with zero reported cache tokens. Gateway price metadata was unpriced: cost is unknown, not free. Direct DeepSeek access and transport parity remain unverified.

The coordinator's browser checks passed three first-stage and seven second-stage assertions at the same loopback origin. The subject's own checks were one static Node check, then a syntax check and a DOM/storage stub. Those are not real-browser evidence. Browser checks do not establish cross-device storage, durability after clearing browser data, accessibility quality, educational usefulness or a population success rate.

## Run the Observer Checks

From the article repository after its normal frozen-lockfile dependency install:

```sh
bun test ./examples/dogfood/evidence.test.ts
bun run check
bun run build
```

The tests read the retained corpus and qualify missing-result, missing-terminal and changed-snapshot refusals. They do not rerun the model. The browser observer imports the existing article's plain-browser lifecycle. Its CLI requires an input snapshot, the ordinary http-server 14.1.1 script installed through the reader recipe, and a new output directory:

```sh
bun examples/dogfood/browser.ts observe /absolute/snapshot /absolute/tools/node_modules/http-server/bin/http-server /absolute/new-observations 2
```

The observer owns and closes its static server, fresh browser context and browser. `qualify` in place of `observe` creates observer-only correct, missing-save, missing-restore and non-persisted-clear fixtures at the supplied root, then exercises the same browser reader. Never copy those controls into a subject folder. The correct control passes; save/restore defects lose text on reload; the clear defect restores stale text. A deliberately missing server produces an instrument failure, not a note failure.

No production article or manuscript was changed. The next step is an independent read of the whole pilot before any adjustment or repeat. Educational usefulness remains a later human decision.

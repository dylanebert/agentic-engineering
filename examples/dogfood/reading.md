# A Note That Survives Reload

<a id="overview"></a>

I asked a cheap model to write a spec, implement one stage, then add persistence in a fresh conversation. All three attempts produced pages that passed the recorded browser checks. That isn't the whole result: the first attempt read prior transcript bytes, and the adjusted attempt wrote a test file outside its instructed folder. The final replay stayed within its recorded file context, but still made a testing mistake.

This is a small worked example, not a benchmark or a beginner study. The model was DeepSeek V4 Flash 0731 at max effort through an existing private gateway, using stock Pi 0.85.1. Direct public DeepSeek access and equivalent behavior on that transport remain unverified. No production article interaction has been built.

Every explanation below is a paraphrase unless marked **Quote**. JSONL fragments identify entry IDs, not working browser anchors. The [source map](mapping.json) gives every retained file and persistent/observation entry a reading destination and disposition; stock event streams remain linked in full, including repetitive deltas. The original attempt stays intact, not spliced into the replay.

## Supply a Small Task

<a id="setup"></a>

The supplied request was one editable note and a Clear button. First make editing and clearing work. Then preserve the current text, including an empty note, across reloads at the same browser address. No framework, account system, server-side storage, sync, deployment or styling brief.

I supplied that split, the prompts and the browser actions. The model wrote its own spec and chose the implementation. It did not independently invent the whole process. The app started with three prompt files and no page or SPEC.md. Future-stage prompts were already readable as files; their conditional pass sentence was not evidence that a browser check had happened yet.

Before running, I installed pinned Pi and http-server packages into a separate support folder. Configuration, credentials, sessions, snapshots and controls stayed there too, with no links from the app. The subject ran with an empty HOME, cleared environment and resource discovery disabled. Stock shell tools still had same-user machine access; this arrangement was not containment.

Node 26.7.0, Bun 1.4.0, GNU time/timeout and an authorized model account were already available. Acquiring those prerequisites is extra work, not something this run timed for a beginner. The gateway credential was resolved privately into temporary configuration, then removed after use. No gateway account or secret is part of the reader kit.

Sources: [unchanged prompts and exact setup](adjusted-reader/README.md), [attempt 2 binding](adjusted-corpus/adjusted/binding.json), [replay binding](adjusted-corpus/replay/binding.json), [setup/intervention account](adjusted-corpus/actions.json). The runnable appendix below reproduces the frozen kit, including environment, time budget, serving and teardown steps.

## Keep the First Attempt Visible

<a id="original"></a>

The original pilot passed three editing/Clear assertions and seven persistence assertions. It used 20 model requests and 26 tool calls in 84.03 subject-process seconds. No corrective follow-up or coordinator code repair was needed.

But its setup placed records and configuration inside the folder the model inspected. In [entry 376ee6cf](corpus/pilot/stage-two/session.jsonl), the model ran `wc -l records/*.jsonl`. Counting lines reads bytes. That violated the instruction against reading prior conversations, even though the tool returned only filenames, sizes and counts, not dialogue. The final no-transcript-read claim was too broad. Neither dialogue exposure nor no influence whatsoever is established.

The documented server also served that whole folder, while the actual observer served snapshots excluding runtime directories. Those observations did not establish the safety of the literal full-folder recipe. No credential leak was observed. A fresh independent decision retained the task and selected one setup change: separate the app and runtime roots. The original pilot is behaviorally passing but clean-context protocol-invalid.

Sources: [original kit](corpus/initial/README.md), [all original conversations](corpus/index.json), [original browser outcome](corpus/pilot/stage-two/browser/observations.json). Its untouched final page is [here](corpus/pilot/snapshots/stage-two/index.html); it is evidence, not starting scaffolding.

## Preserve the Adjusted Attempt's Detours

<a id="adjusted"></a>

Attempt 2 used the separated setup and the same three prompts. The model wrote a usable spec, implemented editing/Clear, then added persistence after the first browser pass. Both browser stages passed. I supplied no code repair or corrective prompt.

Its own checks were less tidy. Two first-stage simulations failed because the fake Clear button lacked `addEventListener`. In stage two, two simulations inside one shell call failed on missing `addEventListener` and `focus`. The model repaired its test doubles, not the page. These were real subject testing mistakes, unlike the deliberately broken observer controls.

It also extracted its own page script to `/tmp/note-script.js` and read that file for checks, violating “work only in this folder.” The saved bytes exactly match its own script; the recorded extraction did not read pre-existing bytes. I retained the file and disclosed the violation rather than claiming strict folder compliance. Its pre-existence was not observed, so I did not delete an unknown prior path.

No prior-attempt, private-instruction or outside-solution content appeared in the audited calls. That distinction allowed the predeclared replay to proceed without a second setup change. It does not make the outside-folder action compliant or prove isolation. The model also removed its placeholder in stage two to match its own spec; that was its decision, not a hidden coordinator edit.

Sources: [first-stage errors and repairs](adjusted-corpus/adjusted/stage-one/session.jsonl), [second-stage errors, extraction and repair](adjusted-corpus/adjusted/stage-two/session.jsonl), [extracted bytes](adjusted-corpus/adjusted/receipts/subject-note-script.js), [whole-app browser result](adjusted-corpus/adjusted/receipts/stage-two-browser/observations.json).

## Follow the Final Replay

<a id="replay-spec"></a>

The replay began from a fresh copy of the original three prompts, not either completed app. It had its own installed dependencies, config, empty HOME and record directories. I kept Flash 0731/max and the gateway unchanged. Each of the following stages was a new conversation, not a resumed session.

The first request asked only for SPEC.md. The model wrote both stages and browser checks, including keeping an empty note empty after reload. I read the spec and accepted it without edits. Its wording suggested opening the file directly; the supplied person-facing recipe and actual checks used HTTP at `http://127.0.0.1:8765/`. This experiment does not demonstrate file-URL persistence.

Sources: [spec prompt and result](adjusted-corpus/replay/spec/session.jsonl), [unedited spec](adjusted-corpus/replay/snapshots/after-spec/SPEC.md). The storage API choice in that spec was the model's, not a supplied solution.

<a id="replay-one"></a>

The next conversation read the task and spec, then created index.html with a textarea, Clear button and click handler. It did not add persistence. Its Node syntax check passed. An installed `tidy` command emitted warnings, but a shell fallback misleadingly printed `tidy not available`. The record shows it ran; the model attributed the warnings to an older parser. That is not proof of full HTML validity.

I served the complete app, opened a fresh Chromium context and checked three things: empty start, multiline editing, and Clear. All passed. Only then did I send the unchanged second-stage prompt containing that observation. Browser storage was fresh at each observation start, not silently inherited from an earlier attempt.

Sources: [implementation and tidy output, entry 629b8110](adjusted-corpus/replay/stage-one/session.jsonl), [first-stage browser actions](adjusted-corpus/replay/receipts/stage-one-browser/observations.json), [stage-one page](adjusted-corpus/replay/snapshots/stage-one/index.html).

<a id="replay-two"></a>

The third conversation added restore-on-load, save-on-input and saving an empty string on Clear. Its first simulation called the click handler on the note instead of the Clear button and threw a TypeError. The model caught its testing mistake and reran the simulation with the correct target. The application code was not repaired in response.

**Quote**, [entry d098c486](adjusted-corpus/replay/stage-two/session.jsonl):

> My test harness had a bug (called `note.listeners.click` instead of `clear.listeners.click`). Let me fix the test:

The repaired simulation printed expected-looking values. It did not assert equality. The final response nevertheless said, **Quote**, [entry d2d1ddb8](adjusted-corpus/replay/stage-two/session.jsonl):

> All six assertions passed.

That claim overstates the test. A printed expected value is not an assertion, and a mocked DOM is not a browser. I kept both the failed simulation and the inaccurate summary rather than turning them into a clean success story.

<a id="browser"></a>

The independent second-stage check used a new Chromium context and the same origin through reloads. It confirmed empty start, multiline entry and Clear; saved two lines and reloaded; replaced them with `Edited note` and reloaded; then cleared, checked empty, reloaded and checked empty again. All seven assertions passed on the unedited page.

[Final replay browser evidence](adjusted-corpus/replay/receipts/stage-two-browser/observations.json) records actual values, hashes, timestamps, browser version and teardown. The [final page](adjusted-corpus/replay/snapshots/stage-two/index.html) and screenshots are retained. Both new attempts' untouched stage snapshots were checked again, with distinct receipts and identical outcomes. These were observer rechecks, not extra task attempts.

This demonstrates the requested behavior in Chromium 151.0.7922.34 at that origin. It does not establish sync, backup, accessibility quality, persistence after deleting browser data, another browser engine, or editing with storage denied. The replay lacks the adjusted page's storage-error guards; storage-denied behavior was not tested in a real browser.

## Separate Model Work From Observation Work

<a id="controls"></a>

Before the task runs, I checked the recording and browser instruments. A successful tool and an intentional exit-7 tool both survived the stock records. A known-correct page passed. Missing save and missing restore each lost text after reload; failing to persist Clear restored stale text. A missing server script was unavailable, not a note failure. These deliberately broken controls never entered subject context.

There were observer defects too. The initial evidence checker expected the wrong terminal event and needed repair before attempt 1. Teardown was strengthened after that attempt, followed by rechecks. The first Git archive omitted ignored evidence logs; a task-local tracking fix made the retained corpus complete. None was repaired by the cheap subject or evidence of an application bug.

Sources: [original qualification](corpus/qualification/), [new qualification](adjusted-corpus/qualification/), [actual observer red/green receipts](adjusted-corpus/observer-history/), [teardown](adjusted-corpus/teardown.json). Mutation fixtures that remove a repair mapping or alter an outcome are checker tests, not events in the narrated campaign.

## Compare the Attempts and the Bill

<a id="cost"></a>

| Attempt | Subject seconds | Model requests | Tool calls | Failed tool calls | Corrective follow-ups | Browser stages | Context limit |
|---|---:|---:|---:|---:|---:|---|---|
| 1, original | 84.03 | 20 | 26 | 0 | 0 | Both pass | Prior transcript bytes read; protocol-invalid |
| 2, separated setup | 205.38 | 20 | 19 | 3 | 0 | Both pass | Own extracted script outside instructed folder |
| 3, gateway replay | 97.79 | 18 | 18 | 1 | 0 | Both pass | No prohibited context access in recorded calls; no containment guarantee |

One failed tool call in attempt 2 contained two failing simulations. The replay's tidy warnings were inside a command that ultimately succeeded. Neither fact disappears just because a tool-error counter is small. There were nine task conversations and nine supplied user prompts overall, 58 model requests, 63 tool calls and no corrective follow-ups. All subject processes exited 0 within their ten-minute cumulative limits.

The three subject totals sum to 387.20 seconds. They exclude installation, reading specs, snapshots, browser checks, architecture, repository gates and editorial work. Those activities took additional time and were not continuously timed end to end. Process and browser timestamps are retained where available. The two recording canaries are separate model usage, not task attempts.

| Attempt | Input tokens | Output tokens | Total reported tokens |
|---|---:|---:|---:|
| Original | 92,167 | 6,329 | 98,496 |
| Adjusted | 76,763 | 7,865 | 84,628 |
| Replay | 58,817 | 5,852 | 64,669 |
| Task total | 227,747 | 20,046 | 247,793 |

Usage sums final assistant messages once, cross-checked against authoritative event messages, not streaming cumulative totals. Reported cache counts are zero. Gateway prices are unpriced: the actual bill is unknown, not free. Two canaries add 7,778 reported tokens, separately from this table.

The coordinator's [2026-09-08 public price reference](pricing.md) lists direct-provider cache-miss input/output rates of $0.22/$0.66 per million off-peak and $0.44/$1.32 peak. Under an all-cache-miss assumption, treating these reported output tokens as fully billable output, the three task attempts would illustrate about $0.0633 off-peak or $0.1267 peak. Those are not gateway charges or a tested equivalent public run.

Thinking-token accounting parity is unverified; do not add the reported reasoning field again without knowing the billing schema.

Sources: [original accounting](corpus/pilot/summary.json), [new accounting and qualification](adjusted-corpus/index.json), [stock launch receipts](adjusted-corpus/commands.json). Setup and browser timestamps live beside each attempt, not hidden inside the subject total.

## What This Example Can Support

<a id="limits"></a>

The saved note is small enough to inspect, with a useful persistence boundary: clearing text is not enough unless empty state survives reload. The final replay supports a concrete spec → implement → independently verify example under the recorded gateway conditions. It does not support a universally smooth setup, reliable folder confinement, superiority over one-shot prompting, or a model success rate.

I would place this beside the article's loop and verification sections: task, model spec, first implementation/check, persistence change, failed simulation/repair, then actual browser result. Keep setup, the rejected original condition and attempt comparison discoverable beside that sequence. Static source-linked blocks and screenshots are sufficient for this first reading. No player, live API or production page change is implied.

The [reference comparison](comparison.md) covers prose and reading order, not a visual style or synthetic taste score. A fresh reviewer must check whether this compression hides consequential work. Dylan owns whether the example is useful for a beginner. That verdict has not happened.

## Runnable Appendix

<a id="recipe"></a>

The complete frozen setup and browser procedure follows. It is the recipe used for attempts 2 and 3, not a revised prompt tuned after their outcomes. Select only the `app` prompts for the subject; keep this reading, records and controls outside its context. The [task](adjusted-reader/app/task.txt), [first-stage prompt](adjusted-reader/app/stage-one.txt) and [second-stage prompt](adjusted-reader/app/stage-two.txt) remain byte-identical to the original.

<!-- frozen-recipe -->

# One Saved Note: Separated Setup

This kit supplies three task prompts, settings and these instructions, not a note implementation. You need a terminal, Bun 1.4.0, Node.js 26.7.0, GNU timeout (`gtimeout` on this Mac), a browser and already-authorized paid model access. Those programs were preinstalled on the measured machine; installing them and obtaining an account are additional prerequisites, not measured beginner steps.

## Prepare Separate Roots

Acquire only this `adjusted-reader` directory. Set `KIT` to its absolute location. Keep one terminal open. Never copy completed examples, transcripts or observer controls into the app. These commands create new directories, not a workspace link:

```sh
export KIT=/absolute/path/to/adjusted-reader
export APP=$(mktemp -d /tmp/saved-note-app-XXXXXX)
export SUPPORT=$(mktemp -d /tmp/saved-note-support-XXXXXX)
cp "$KIT/app/"*.txt "$APP/"
mkdir "$SUPPORT/tools" "$SUPPORT/config" "$SUPPORT/home" "$SUPPORT/records" "$SUPPORT/snapshots"
bun install --cwd "$SUPPORT/tools" --ignore-scripts --exact @earendil-works/pi-coding-agent@0.85.1 http-server@14.1.1 > "$SUPPORT/install.log" 2>&1
cp "$KIT/settings.json" "$SUPPORT/config/settings.json"
export NODE=$(command -v node)
export LIMIT=$(command -v gtimeout)
export CLEAN_PATH="$(dirname "$NODE"):/usr/bin:/bin:/usr/sbin:/sbin"
export PI="$SUPPORT/tools/node_modules/@earendil-works/pi-coding-agent/dist/cli.js"
export SERVER="$SUPPORT/tools/node_modules/http-server/bin/http-server"
"$NODE" "$PI" --version
cd "$APP"
```

Stop if installation or version inspection fails. The app initially contains only task.txt, stage-one.txt and stage-two.txt. Runtime dependencies, configuration, credentials, empty HOME, records and snapshots stay in SUPPORT. No links point back from APP. Separate folders reduce accidental access; they are not an operating-system sandbox. Stock shell tools still have your user account's authority and expose current-session metadata.

## Configure Existing Access Privately

The measured route is private `ai-gw-baseten/baseten/deepseek-ai/DeepSeek-V4-Flash-0731`, at max effort. The coordinator copied just that provider/model configuration, resolved its existing credential command privately, and replaced session-attribution header interpolation with a nonsecret run label. No credential, gateway URL or account configuration is distributed. These preparation operations used ordinary file/shell operations, not a Pi extension.

For an already-authorized direct DeepSeek account, Pi documents a `deepseek` entry in `auth.json` of the form `{"deepseek":{"type":"api_key","key":"YOUR_EXISTING_KEY"}}`. Create that file privately at `$SUPPORT/config/auth.json`, with mode 600. Do not paste its content into a prompt or published receipt. Select `MODEL=deepseek/deepseek-v4-flash`. This public route and its transport parity are unverified here; do not infer tested access from documentation.

The measured gateway instead uses a private `$SUPPORT/config/models.json` and:

```sh
export MODEL=ai-gw-baseten/baseten/deepseek-ai/DeepSeek-V4-Flash-0731
```

Do not use the gateway name as a public access recipe. Missing authorized access is a stop, not a reason to create an account or change models after a task error.

## Run Three Fresh Conversations

Start the cumulative subject allowance at 600 seconds. Before each conversation, copy the entire APP to a new directory in SUPPORT/snapshots. Record its file inventory and SHA-256 hashes outside APP. The coordinator uses ordinary recursive copies and file hashes, rejects links, and compares the entire app before and after browser observation. No observer files are supplied to the subject.

For the first conversation set `STAGE=spec`, `PROMPT=task.txt`, `REMAINING=600`. Use this same command shape for each conversation:

```sh
mkdir "$SUPPORT/records/$STAGE"
# Record start time immediately before this command and end/exit immediately after.
/usr/bin/time -p -o "$SUPPORT/records/$STAGE/time.txt" \
  "$LIMIT" --signal=TERM --kill-after=5 "$REMAINING" \
  env -i HOME="$SUPPORT/home" PATH="$CLEAN_PATH" \
  PI_CODING_AGENT_DIR="$SUPPORT/config" PI_OFFLINE=1 PI_TELEMETRY=0 \
  "$NODE" "$PI" --no-approve --no-extensions --no-skills \
  --no-prompt-templates --no-themes --no-context-files \
  --tools read,bash,edit,write --model "$MODEL" --thinking max \
  --session-dir "$SUPPORT/records/$STAGE" --mode json -p "@$PROMPT" \
  > "$SUPPORT/records/$STAGE/events.jsonl" \
  2> "$SUPPORT/records/$STAGE/stderr.txt"
printf 'exit=%s\n' "$?"
```

Environment clearing and a new empty HOME prevent incidental shell/user configuration from being inherited. Pi keeps its stock system prompt and tools. No skills, extensions, templates, project instructions, automatic retries or compaction are used. The records contain both persistent sessions and stock event streams. Do not resume, fork or continue a prior conversation. Review recorded tool calls, including counts and hashes, for access outside the allowed files.

After each process, subtract its elapsed wall time from 600, rounding the remaining allowance down to whole seconds. Setup, reading, snapshots and browser work are separate time. A timeout may leave an interrupted request: retain that evidence and inspect only owned processes before cleanup. Never silently retry a failed task. At most two observation-only corrective follow-ups are allowed across an attempt, within the same cumulative budget; preserve each exact prompt and outcome.

Read the generated SPEC.md. It must describe both stages and browser checks without implementing the page. Stop if unusable; do not replace it with an expert spec. Preserve the files, then set `STAGE=stage-one`, `PROMPT=stage-one.txt` and the remaining seconds. Run the command again in a fresh conversation.

## Check Editing Before Persistence

After stage one exits, preserve the complete app. Serve **APP only**, never SUPPORT or KIT:

```sh
"$NODE" "$SERVER" "$APP" -a 127.0.0.1 -p 8765 -c-1
```

Open `http://127.0.0.1:8765/` in a fresh private browser window. Confirm an empty note, enter `First line` and `Second line` on separate lines, then click Clear and confirm empty text. If the model chose another entry file, record that navigation. A port conflict is setup failure: never kill someone else's process.

Close the private window and stop your server with Ctrl+C. Record actions, expected and actual text, browser version, origin, file hashes and outcome. The coordinator performs these actions with a bounded headless Chromium observer, then closes its context/browser/server. It uses the complete app root, not a filtered implementation-only snapshot.

Only after all first-stage browser checks pass, set `STAGE=stage-two`, `PROMPT=stage-two.txt` and the remaining allowance. Its prompt contains that observed pass, so do not send it after a failure. Run the same fresh-conversation command and preserve its unedited output.

## Check Reloads and Stop

Serve APP at the same address. Start a new private browser window, then keep that window and origin for all actions:

1. Confirm empty; enter the two lines and Clear.
2. Enter `Saved line` and `Keep this` on separate lines. Reload and confirm both remain.
3. Replace them with `Edited note`. Reload and confirm it remains.
4. Click Clear, confirm empty, then reload and confirm still empty.

Close the window and stop the owned server. Private-window data normally disappears when its window closes. These observations cover one browser/origin, not sync, backup, another device or deleted browser data. A model's static or simulated test is not this browser observation.

Retain every prompt, tool result, failure, exit, timing and boundary snapshot. Scrub temporary credential copies after subject use; never publish account configuration. Verify no owned subject/browser/server survives. Delete only directories you created, after preserving and checking the evidence; keep failed observations too.

This finite campaign allows at most three attempts total, including the original condition. The selected setup adjustment is used once, followed by at most one replay from these frozen initial inputs. An unusable spec, exhausted budget, missing access or unresolved context contamination stops the campaign. A failed replay is reportable, not a cue for another try.

### Frozen task.txt

```text
I want a plain browser page with one editable note and a Clear button.
First write a short spec in SPEC.md. Do not implement yet.
Split the work into two stages: first make editing and clearing work; then preserve the current text, including an empty note, across a reload in the same browser at the same address.
Include how a person can check each stage in a browser. Keep it small: no accounts, server-side data, sync, framework, deployment, or styling brief.
Work only in this folder. Do not read other projects, prior conversations, credentials, or outside solutions. Do not start servers or browsers; a person will run the browser checks between stages.
```

### Frozen stage-one.txt

```text
Read task.txt and SPEC.md, and inspect the current files in this folder. Implement only the first stage of your spec: editing and clearing the note. Do not add persistence yet. Run any appropriate checks you can without starting a server or browser. Report what you changed, what you checked, and what still needs a person's browser check, then stop. Work only in this folder; do not read other projects, prior conversations, credentials, or outside solutions.
```

### Frozen stage-two.txt

```text
The first-stage browser check passed: a fresh page began empty, multiline text could be entered, and Clear emptied it. Read task.txt, SPEC.md, and the current files in this folder. Implement only the second stage of your spec: preserve the current text, including an empty note, across a reload in the same browser at the same address. Run any appropriate checks you can without starting a server or browser. Report what you changed, what you checked, and what still needs a person's browser check, then stop. Work only in this folder; do not read other projects, prior conversations, credentials, or outside solutions.
```

### Frozen settings.json

```json
{
  "packages": [],
  "compaction": { "enabled": false },
  "retry": { "enabled": false, "provider": { "maxRetries": 0 } },
  "enableInstallTelemetry": false,
  "defaultProjectTrust": "never"
}
```

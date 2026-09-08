# A Note That Survives Reload

<a id="overview"></a>

I asked a cheap model to write a spec, implement one stage, then add persistence in a fresh conversation. All three attempts produced pages that passed the recorded browser checks. That isn't the whole result: the first attempt read prior transcript bytes, and the adjusted attempt wrote a test file outside its instructed folder. The final replay stayed within its recorded file context, but still made a testing mistake.

This is a small worked example, not a benchmark or a beginner study. The model was DeepSeek V4 Flash 0731 at max effort through an existing private gateway, using stock Pi 0.85.1. Direct public DeepSeek access and equivalent behavior on that transport remain unverified. No production article interaction has been built.

Every explanation below is a paraphrase unless marked **Quote**. JSONL fragments identify entry IDs, not working browser anchors. The [source map](mapping.json) gives every frozen-corpus file and persistent/observation entry, plus the post-run supplement, a reading destination and disposition; stock event streams remain linked in full, including repetitive deltas. The original attempt stays intact, not spliced into the replay.

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

The original simulation printed values rather than asserting equality. Its storage-denied arm demonstrated loading without a crash, not editing or clearing under denied storage, despite the final response’s claim.

Sources: [simulation 62b4ce9c, result 2251be77 and final claim 9b32f330](corpus/pilot/stage-two/session.jsonl). The denied-storage stub discarded event handlers; it never exercised editing or Clear. This limits the model’s own verification, not the independently passing browser result, and is not an observed application defect.

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

The [reference comparison](comparison.md) covers prose and reading order, not a visual style or synthetic taste score. Fresh fidelity review found missing setup detail and an omitted original-test limit. This reading includes the owner's known repairs; no second review or subject run was needed. Dylan owns whether the example is useful for a beginner. That educational verdict has not happened.

## Runnable Appendix

<a id="recipe"></a>

The complete frozen setup and browser procedure follows. Fidelity review found missing acquisition, prerequisite and recording details; the [post-run supplement](#supplement), included in full after the frozen appendix, supplies those details without rewriting the measured condition.

The frozen appendix is the recipe used for attempts 2 and 3, not a revised prompt tuned after their outcomes. Select only the `app` prompts for the subject; keep this reading, records and controls outside its context. The [task](adjusted-reader/app/task.txt), [first-stage prompt](adjusted-reader/app/stage-one.txt) and [second-stage prompt](adjusted-reader/app/stage-two.txt) remain byte-identical to the original.

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



<!-- post-run-supplement -->

# Post-Run Reader Supplement

<a id="supplement"></a>

**Added after fidelity review. These commands were not replay-tested inputs.** The frozen kit and all three attempts are unchanged. This supplement fills acquisition, prerequisite and recording gaps in that kit; it adds no note implementation or new subject attempt. Any command checks reported here are editorial fixtures, not another model run. Keep this supplement outside the subject's app folder.

## Acquire Only the Pinned Reader Files

Use Git and tar, not a checkout of the article or a copy of its completed examples. This fetches an immutable public commit into a new temporary object store, then extracts only its five reader files. Git/tar are additional acquisition prerequisites. Check `git --version` and `tar --version` first; installing them was not measured by this campaign.

<!-- supplement:acquire -->
```sh
export ACQUIRE=$(mktemp -d /tmp/note-acquire-XXXXXX)
export KIT=$(mktemp -d /tmp/note-kit-XXXXXX)
git -C "$ACQUIRE" init --bare
git -C "$ACQUIRE" fetch --depth=1 https://github.com/dylanebert/agentic-engineering.git e06ba1fb9d007fb2d63a9ba6f1561fa448a3d8fb
git -C "$ACQUIRE" archive e06ba1fb9d007fb2d63a9ba6f1561fa448a3d8fb examples/dogfood/adjusted-reader > "$ACQUIRE/reader.tar"
tar -xf "$ACQUIRE/reader.tar" --strip-components=3 -C "$KIT"
```

Stop on any failed command. Expected files: README.md, settings.json and app/{task,stage-one,stage-two}.txt only. No SPEC.md, page, transcript, observer or credential belongs in this acquired kit. The exact hashes are checked below. Use this KIT with the frozen preparation instructions, which create separate APP and SUPPORT roots and install Pi/http-server outside APP.

## Check Prerequisites Before Launching

Official installation references, retrieved by the coordinator on 2026-09-08: [Bun](https://bun.sh/docs/installation), [Node.js](https://nodejs.org/en/download), [Python for macOS](https://www.python.org/downloads/macos/), and [GNU timeout usage](https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html). The GNU page documents usage, not a tested macOS installation recipe. This example used preinstalled `gtimeout` and `/usr/bin/time`; their installation is not demonstrated. Do not confuse current download listings with measured versions.

Python was available during both new attempts: [adjusted entry 956f68d4](adjusted-corpus/adjusted/stage-two/session.jsonl) invoked `python3`, and [replay entry 153dfeb2/result e2e6d74a](adjusted-corpus/replay/stage-two/session.jsonl) ran HTMLParser successfully. **Its historical version was not captured.** The model chose to use Python; it was not a declared prerequisite in the frozen kit. A version printed now describes your setup, not the earlier run.

After the frozen preparation sets SUPPORT and CLEAN_PATH, save availability/version output there. Python is checked in that cleared launch environment, not merely your interactive shell. Missing commands are a setup stop. The measured versions were Bun 1.4.0 and external Node 26.7.0; Python, Git, tar and GNU timeout versions were not recorded as historical prerequisites. These checks do not establish an authorized model account.

<!-- supplement:prerequisites -->
```sh
if {
  command -v bun && bun --version &&
  command -v node && node --version &&
  env -i HOME="$SUPPORT/home" PATH="$CLEAN_PATH" /bin/sh -c 'command -v python3 && python3 --version' &&
  command -v git && git --version &&
  command -v tar && tar --version &&
  command -v gtimeout && gtimeout --version &&
  test -x /usr/bin/time
} > "$SUPPORT/prerequisites.txt" 2>&1; then
  PREREQUISITES_STATUS=0
else
  PREREQUISITES_STATUS=$?
fi
printf '%s\n' "$PREREQUISITES_STATUS" > "$SUPPORT/prerequisites.exit"
test "$PREREQUISITES_STATUS" -eq 0
```

Preserve the command's status and read the output before continuing. Account setup remains private and separately unverified for direct DeepSeek, as described in the frozen recipe. Never paste credentials into these records.

## Hash and Snapshot the Whole App

The following ordinary Node commands replace the private snapshot helper's missing public equivalent. They reject symbolic links, existing snapshot destinations and a changed copy. They preserve all app files, not a filtered implementation-only subset. Support and snapshots remain outside APP; directory separation still is not containment.

<!-- supplement:snapshot -->
```sh
snapshot() {
  node --input-type=module - "$APP" "$SUPPORT" "$1" <<'JS'
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [app, support, name] = process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(name), 'snapshot name');
const source = fs.realpathSync(app);
const outside = fs.realpathSync(support);
assert(outside !== source && !outside.startsWith(source + path.sep), 'support outside app');
function inventory(root) {
  const result = {};
  function visit(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir).sort()) {
      const file = path.join(dir, entry), relative = prefix + entry;
      const stat = fs.lstatSync(file);
      assert(!stat.isSymbolicLink(), 'no links in app');
      if (stat.isDirectory()) visit(file, relative + '/');
      else {
        assert(stat.isFile(), 'ordinary files only');
        result[relative] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      }
    }
  }
  visit(root);
  return result;
}
const hashes = inventory(source);
assert(Object.keys(hashes).length > 0, 'nonempty app');
const destination = path.join(outside, 'snapshots', name);
assert(!fs.existsSync(destination), 'snapshot destination must be absent');
fs.cpSync(source, destination, { recursive: true, errorOnExist: true, force: false });
assert.deepEqual(inventory(destination), hashes, 'snapshot bytes');
fs.writeFileSync(destination + '.json', JSON.stringify({
  at: new Date().toISOString(), source, destination, hashes
}, null, 2) + '\n', { flag: 'wx' });
JS
}
snapshot before-spec
```

Before launching, verify the acquired kit independently against the frozen five-file inventory. This hashes bytes; it does not ask the model to read other contexts.

<!-- supplement:kit-hashes -->
```sh
node --input-type=module - "$KIT" <<'JS'
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root = process.argv[2];
const expected = {
  'README.md': '11f441c1e5a5a4e6fd65ff67efb5011410da5e479af65c45ab91d3a5191549e2',
  'settings.json': 'fbbd9ef1679904dedddae25b530d43824d062a0d635529fa4e5edd9e74e8919b',
  'app/task.txt': 'e3f7474f0736cd70c22008fd6f1decb4c170dec875d3791a43940d263ee19863',
  'app/stage-one.txt': 'd21afab51b0b7cae3454c0b9d7c3c63c0499ca124af01dff5a36c8e01cd36770',
  'app/stage-two.txt': '37774bd877eef1ed304cba74d3c98e6903356a170f2d0076aaa025264d78d690'
};
const actual = {};
for (const file of fs.readdirSync(root, { recursive: true })) {
  const stat = fs.lstatSync(root + '/' + file);
  assert(!stat.isSymbolicLink(), 'no kit links');
  if (stat.isFile()) actual[file] = crypto.createHash('sha256').update(fs.readFileSync(root + '/' + file)).digest('hex');
}
assert.deepEqual(actual, expected, 'only pinned reader files');
console.log('five pinned reader files verified');
JS
```

## Preserve Timing and Use a Cumulative Budget

Set STAGE and PROMPT explicitly. Recompute REMAINING before **every** conversation by summing every prior `records/*/time.txt`, including any permitted corrective follow-ups. The function refuses a prior record directory without timing, rather than treating missing time as zero. It subtracts the sum from 600 and rounds down, not merely subtracting the latest conversation.

<!-- supplement:budget -->
```sh
remaining_seconds() {
  node --input-type=module - "$SUPPORT" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const records = process.argv[2] + '/records';
let elapsed = 0;
for (const name of fs.readdirSync(records)) {
  const dir = records + '/' + name;
  if (!fs.statSync(dir).isDirectory()) continue;
  const text = fs.readFileSync(dir + '/time.txt', 'utf8');
  const match = text.match(/^real\s+([0-9]+(?:\.[0-9]+)?)\s*$/m);
  assert(match, 'missing elapsed wall time');
  elapsed += Number(match[1]);
}
const remaining = Math.floor(600 - elapsed);
assert(remaining > 0, 'cumulative subject budget exhausted');
console.log(remaining);
JS
}
export STAGE=spec PROMPT=task.txt
REMAINING=$(remaining_seconds) || exit 1
export REMAINING
```

For example, adjusted stage two had `floor(600 - 54.05 - 88.47) = 457` seconds left; replay stage two had `floor(600 - 17.14 - 27.22) = 555`. Those historical values are independently retained in [command receipts](adjusted-corpus/commands.json) and time.txt files. New local measurements must not overwrite them.

Use the frozen recipe's NODE, LIMIT, CLEAN_PATH, PI, MODEL, APP and SUPPORT variables. This replaces its launch fragment only for a reader following this **post-run supplement**. It preserves UTC boundaries, process exit and the exact remaining allowance. The experiment owner must not execute it again: all three attempts are consumed.

<!-- supplement:launch -->
```sh
cd "$APP"
mkdir "$SUPPORT/records/$STAGE" || exit 1
printf '%s\n' "$REMAINING" > "$SUPPORT/records/$STAGE/remaining.txt"
date -u '+%Y-%m-%dT%H:%M:%SZ' > "$SUPPORT/records/$STAGE/start.txt"
if /usr/bin/time -p -o "$SUPPORT/records/$STAGE/time.txt" \
  "$LIMIT" --signal=TERM --kill-after=5 "$REMAINING" \
  env -i HOME="$SUPPORT/home" PATH="$CLEAN_PATH" \
  PI_CODING_AGENT_DIR="$SUPPORT/config" PI_OFFLINE=1 PI_TELEMETRY=0 \
  "$NODE" "$PI" --no-approve --no-extensions --no-skills \
  --no-prompt-templates --no-themes --no-context-files \
  --tools read,bash,edit,write --model "$MODEL" --thinking max \
  --session-dir "$SUPPORT/records/$STAGE" --mode json -p "@$PROMPT" \
  > "$SUPPORT/records/$STAGE/events.jsonl" \
  2> "$SUPPORT/records/$STAGE/stderr.txt"; then
  STATUS=0
else
  STATUS=$?
fi
printf '%s\n' "$STATUS" > "$SUPPORT/records/$STAGE/exit.txt"
date -u '+%Y-%m-%dT%H:%M:%SZ' > "$SUPPORT/records/$STAGE/end.txt"
printf 'recorded exit=%s\n' "$STATUS"
```

A nonzero exit, timeout, unusable spec or exhausted allowance is a stop, not permission to repeat until success. Read the preserved output. Audit actual tool calls for prohibited context access. No snapshot, hash or elapsed-time total substitutes for that audit.

After the spec, run `snapshot after-spec`. Accept it without implementation repairs only if it describes both stages and the requested checks. Set `STAGE=stage-one PROMPT=stage-one.txt`, recompute `REMAINING=$(remaining_seconds) || exit 1`, then use the launch fragment. Run `snapshot stage-one` afterward and the frozen HTTP/browser checks. Record actual observations outside APP; close the browser and server.

Only after the first-stage browser pass, set `STAGE=stage-two PROMPT=stage-two.txt`, recompute the cumulative remaining allowance and use the launch fragment. Run `snapshot stage-two`, then the frozen persistence checks. A new snapshot name is required for any additional boundary; never overwrite an earlier snapshot. Keep app files unchanged during observation, and compare their saved hashes if uncertain.

## Preserve and Clean Up

Keep SUPPORT's prompts/session/event records, hashes, times, exits and observations before deleting anything. Remove temporary credential copies privately after use. Stop only your own processes and verify they exited; never kill another listener to resolve a port conflict. Delete only directories you created after their evidence is preserved. The actual campaign's unknown-pre-existence `/tmp/note-script.js` is specifically excluded from cleanup authority.

This supplement makes previously underspecified work executable. It is not a retroactive setup adjustment, a fourth attempt, proof of a newly tested provider, or evidence that a beginner already followed it successfully.

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

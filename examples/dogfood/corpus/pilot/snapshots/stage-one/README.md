# One Saved Note

This is an experiment kit, not a promise of a successful result. You supply a terminal, Bun 1.4.0, Node.js 26.7.0, a browser, and a paid model account. Pi 0.85.1 supplies the coding tools. Nothing here implements the note. The initial inventory is this README, settings.json, task.txt, stage-one.txt, and stage-two.txt.

## Prepare a Folder

Copy only this `reader` directory into a new folder outside your other projects. Do not copy the observer, controls, transcripts, or completed snapshots. In the commands below, run from that new folder. Keep the same terminal open so its variables persist.

```sh
export RUN="$PWD"
mkdir -p "$RUN/tools" "$RUN/config" "$RUN/records"
bun install --cwd "$RUN/tools" --ignore-scripts --exact @earendil-works/pi-coding-agent@0.85.1 http-server@14.1.1
cp settings.json "$RUN/config/settings.json"
export PI_CODING_AGENT_DIR="$RUN/config"
export PI_OFFLINE=1
export PI_TELEMETRY=0
export PATH="$RUN/tools/node_modules/.bin:$PATH"
pi --version
```

The install creates package metadata and dependencies under tools. Config and records are outside the app files but within this copied folder. Do not paste credentials into a prompt or transcript.

## Choose a Model

The measured pilot uses DeepSeek V4 Flash 0731 at max effort through a private gateway. That gateway is not a reader prerequisite. Pi documents direct DeepSeek authentication, and DeepSeek documents `deepseek-v4-flash` and max effort. Direct-account access and transport parity have not been tested here. See the report before treating these commands as a demonstrated public recipe.

With your own already-authorized DeepSeek account, set `DEEPSEEK_API_KEY` privately, then set:

```sh
export MODEL=deepseek/deepseek-v4-flash
```

Do not buy access or substitute a stronger model just to make an example succeed. Record provider, exact model version, effort, and any access failure. The pilot's private configuration is intentionally not distributed.

## Ask for a Spec

```sh
pi --no-approve --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files --tools read,bash,edit,write --model "$MODEL" --thinking max --session-dir "$RUN/records/spec" --mode json -p @task.txt > "$RUN/records/spec.events.jsonl" 2> "$RUN/records/spec.stderr.txt"
printf 'exit=%s\n' "$?"
```

Read SPEC.md. It must describe the requested two stages and their checks without already implementing the page. If unusable, record that outcome; do not silently replace it with an expert spec.

## Implement One Stage

Run the same Pi command with `@stage-one.txt`, session directory `records/stage-one`, and matching output filenames. Do not use resume, continue, or fork. This fresh conversation receives the request and files, not the previous transcript. Preserve a copy of the files before and after each conversation and browser check.

Serve the resulting files from the same folder:

```sh
http-server . -a 127.0.0.1 -p 8765 -c-1
```

This is an ordinary static-file server, not `file:` URLs or a development server. Open `http://127.0.0.1:8765/` in a fresh private browser window. If the agent chose a different entry filename, follow it and record that step. A port conflict is a setup problem: stop your own prior server or record the conflict; never kill someone else's process.

1. Confirm the note starts empty.
2. Enter two lines: `First line` and `Second line`. Confirm both appear.
3. Click Clear. Confirm the field is empty.

Close the browser window and stop the server with Ctrl+C. Record actual results, not the agent's completion claim. Only if these checks passed, start a fresh conversation using `@stage-two.txt` and new stage-two session/output paths. That prompt contains the first-stage observation, so do not send it after a failed check.

## Check Persistence

Serve the second-stage files with the same command and address. Start a new private browser window, then keep that window and origin throughout these actions:

1. Confirm the starting note is empty, enter the same two lines, then Clear.
2. Enter `Saved line` followed by a second line `Keep this`. Reload. Both lines must remain.
3. Replace the text with `Edited note`. Reload. The edit must remain.
4. Click Clear. Reload. The note must still be empty.

Close the browser and stop your server. This establishes behavior only in this browser at this origin. It promises no sync, backup, cross-device access, or durability after deleting browser data. Private-window data normally disappears when the window closes.

## Stop and Retain

Allow at most ten minutes of cumulative subject-process wall time per task attempt and at most two corrective follow-ups across all its conversations. Time setup and browser work separately. If a check fails, a follow-up may state the exact action, expected result, and observed result, but must not include repaired code. Preserve the follow-up verbatim. Stop on budget exhaustion, unusable spec, or missing access; never retry unchanged until success.

The campaign permits one pilot, at most one justified adjusted pilot after an independent decision, and one clean replay from the original inputs. Keep every attempt, including failed and interrupted runs. These observations are examples, not model success-rate estimates.

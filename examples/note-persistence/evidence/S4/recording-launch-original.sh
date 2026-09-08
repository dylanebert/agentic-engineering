#!/bin/bash
set -u
ROOT=/tmp/agentic-engineering-dogfood-loop-20260908-2012
mkdir "$ROOT/qualification/recording-task"
printf 'stock-recording-qualified\n' > "$ROOT/qualification/recording-task/sentinel.txt"
PROMPT='This is setup recording qualification, not an engineering task. Use read to read missing.txt (which is intentionally absent), then use read to read sentinel.txt. Report the missing-file error and sentinel text. Do not inspect anything else, write files, plan, or implement anything.'
printf '%s\n' "$PROMPT" > "$ROOT/qualification/recording-prompt.txt"
cd "$ROOT/qualification/recording-task" || exit 2
/opt/homebrew/bin/bun -e 'console.log(new Date().toISOString())' > ../recording-start.txt
/usr/bin/time -p env -i HOME="$ROOT/support/home" PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin TMPDIR="$ROOT/support/tmp" PI_CODING_AGENT_DIR="$ROOT/support/config" PI_OFFLINE=1 PI_TELEMETRY=0 \
  /opt/homebrew/bin/gtimeout --signal=TERM --kill-after=5 60 \
  /opt/homebrew/bin/node "$ROOT/support/pi-install/node_modules/@earendil-works/pi-coding-agent/dist/cli.js" \
  --no-approve --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files \
  --tools read --model ai-gw-openai/openai/gpt-5.6-luna --thinking low \
  --session "$ROOT/support/records/qualification.jsonl" --mode json -p "$PROMPT" \
  > ../recording-events.jsonl 2> ../recording-stderr.log
printf '%s\n' "$?" > ../recording.exit
/opt/homebrew/bin/bun -e 'console.log(new Date().toISOString())' > ../recording-end.txt

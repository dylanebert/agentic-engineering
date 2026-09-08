#!/bin/bash
set -u
ROOT=/tmp/agentic-engineering-dogfood-loop-20260908-2012
cd "$ROOT/E1-spec/starter" || exit 2
PROMPT="$(< "$ROOT/support/spec-prompt.txt")"
/opt/homebrew/bin/node -p 'new Date().toISOString()' > "$ROOT/support/records/spec-start.txt"
/usr/bin/time -p env -i HOME="$ROOT/support/home" PATH=/Users/dylan.ebert/.bun/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin TMPDIR="$ROOT/support/tmp" PI_CODING_AGENT_DIR="$ROOT/support/config" PI_OFFLINE=1 PI_TELEMETRY=0 \
  /opt/homebrew/bin/gtimeout --signal=TERM --kill-after=5 45 \
  /opt/homebrew/bin/node "$ROOT/support/pi-install/node_modules/@earendil-works/pi-coding-agent/dist/cli.js" \
  --no-approve --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files \
  --tools read,write --model ai-gw-openai/openai/gpt-5.6-luna --thinking low \
  --session "$ROOT/support/records/spec.jsonl" --mode json -p "$PROMPT" \
  > "$ROOT/support/records/spec-events.jsonl" 2> "$ROOT/support/records/spec-stderr.log"
printf '%s\n' "$?" > "$ROOT/support/records/spec.exit"
/opt/homebrew/bin/node -p 'new Date().toISOString()' > "$ROOT/support/records/spec-end.txt"

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

# Replay Or Use The Saved Note

The final reader archive contains only the saved page, tests, request/spec/result and pinned setup. It contains no agent credentials, sessions, article dependencies or model invocation. Replaying it checks the artifact; it does not repeat E1 with another model.

Use the immutable commit URL supplied with the report as `BASE`. In a new empty directory:

```sh
curl -fsSL "$BASE/reader.tar.gz" -o reader.tar.gz
curl -fsSL "$BASE/reader.tar.gz.sha256" -o reader.tar.gz.sha256
shasum -a 256 -c reader.tar.gz.sha256
tar -xzf reader.tar.gz
cd final
bun install --frozen-lockfile
PLAYWRIGHT_BROWSERS_PATH="$PWD/../browsers" bunx --no-install playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/../browsers" DEBUG=pw:browser,pw:webserver DEBUG_COLORS=0 \
  bunx --no-install playwright test --config playwright.config.ts
```

Prerequisites: Node, Bun, network access for public dependencies/browser acquisition and a free loopback port 18765. Qualification used Node v26.7.0 and Bun 1.4.0 on macOS arm64. Keep the JSON report, stdout/stderr and exit code; expected result is four passing tests, no skips. The config owns and closes its test browser and server.

## Actual Use

From the installed `final/` directory, the person can start a five-minute local server using preinstalled GNU timeout:

```sh
gtimeout --signal=TERM --kill-after=5 300 \
  node node_modules/http-server/bin/http-server app -a 127.0.0.1 -p 18765 -c-1
```

Open **http://127.0.0.1:18765/** in your browser. Use a short real note, reload it, then Clear and reload. The server serves only `app/`; it must fail if the port is occupied. Do not kill another listener. Stop your server with Ctrl+C when finished and close the tab; timeout is a backstop, not a background service to leave running.

Text stays in that browser at that origin. It is not backed up or synced. The loopback address belongs to the machine running the server; a browser on another machine needs a configured connection, not the same-looking local URL.

Dylan has confirmed the note works through a coordinator-operated tunnel to Omarchy. Current feedback concerns only the [revised short reading](reading.md), not repeated functional testing. The [human record](human/feedback.json) separates that confirmation from the rejected prose and the separately scoped embed/design proposal.

## Inspect The Evidence

From a full source checkout at the report's commit, not from the small reader archive:

```sh
bun test ./examples/note-persistence/evidence.test.ts
bun examples/note-persistence/compare.ts ./examples/note-persistence/references
```

The comparison prints the main reading separately from detail, source coverage and unchanged human-marked reference excerpts. Its paragraph/word tripwires do not decide taste. The [old campaign](detail.md#historical-campaign-and-limits) has its own immutable archive and evidence checks; it has not been replaced by E1.

# Setup And Recording

The supplied page supports multiline editing and Clear. Persistence is the requested addition, not a hidden defect. The starter contains no SPEC, persistence implementation or task assertion bodies. Setup qualification is separate from the agent's later tests.

## Acquire The Kit

Download `starter.tar.gz` from this example at the immutable commit named in the report. Check its SHA-256 against `starter.tar.gz.sha256`, then extract it into a new directory outside any existing agent workspace. Only `starter/` belongs in the task workspace. Keep this article, qualification tests, transcripts, credentials and agent configuration outside it.

Qualification used macOS arm64, Node v26.7.0, Bun 1.4.0 and GNU timeout (`gtimeout`). Node, Bun and timeout were preinstalled. Package installation and browser acquisition require network access; no model account is needed to replay browser checks.

From the extracted task directory:

```sh
bun install --frozen-lockfile
PLAYWRIGHT_BROWSERS_PATH="$PWD/../browsers" bunx --no-install playwright install chromium
```

Playwright is pinned to 1.62.1 and http-server to 14.1.1. The browser cache belongs outside the task directory. The config serves only `app/` at `http://127.0.0.1:18765`, refuses an occupied origin and lets Playwright terminate its own server. Do not reuse or kill another listener.

Once the agent has authored tests under `tests/`, its command is:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/../browsers" DEBUG=pw:browser,pw:webserver DEBUG_COLORS=0 \
  bunx --no-install playwright test --config playwright.config.ts
```

Without authored tests, that command is not behavioral verification. Keep stdout, stderr, exit status and `results/` after each run, before another run overwrites them. The config retains screenshots and traces on failure and a JSON report for every run. Debug output records browser launch/exit and server teardown. The agent must read the actual results.

## Stock Pi

Install outside the task directory in a new support directory:

```sh
bun add --exact --ignore-scripts @earendil-works/pi-coding-agent@0.85.1
node node_modules/@earendil-works/pi-coding-agent/dist/cli.js --version
```

Create separate empty HOME, config, temporary-file and recording directories there. The recorded settings disable packages, automatic retries, compaction, project trust and telemetry. Launch from the task directory with a cleared environment, an explicit runtime PATH and these stock flags:

```sh
node /absolute/support/node_modules/@earendil-works/pi-coding-agent/dist/cli.js \
  --no-approve --no-extensions --no-skills --no-prompt-templates --no-themes \
  --no-context-files --tools read,write,edit,bash \
  --provider YOUR_PROVIDER --model YOUR_MODEL --thinking low \
  --session /absolute/records/conversation.jsonl --mode json -p 'YOUR PROMPT' \
  > /absolute/records/events.jsonl 2> /absolute/records/stderr.log
```

The full recorded `env -i`/timeout launch commands accompany the evidence; substitute your own absolute support paths. Set `HOME`, `TMPDIR`, `PI_CODING_AGENT_DIR`, `PI_OFFLINE=1`, `PI_TELEMETRY=0`, the browser-cache path and the runtime PATH explicitly. Save start/end timestamps and the exit code, including failures. Bound all task model processes to a cumulative ten minutes; do not restart a failed attempt. Fresh conversations receive task files, not previous transcripts.

Pi's shell tools expose their own session location through environment metadata. Discovery flags and directory separation are not containment. The recorded experiment audits every tool call, including shell arguments and outputs, against its declared files. Subjects are instructed not to inspect environment/session files or parent directories.

## Accounts And Limits

Local recording qualification used the already-authorized `ai-gw-openai` gateway and `openai/gpt-5.6-luna` at low effort. E1 selects that model for spec and implementation, then `openai/gpt-5.6-sol` at low effort for one fresh read-only review. The gateway's transport parity and actual billing are unknown. Zero-valued cost metadata is not free usage.

For an independent public setup, Pi supports an authorized OpenAI API key through `OPENAI_API_KEY` or its external auth file. Public model identifiers are `gpt-5.6-luna` and `gpt-5.6-sol`; the coordinator's official-source lookup reports low effort support. Direct OpenAI execution was not performed here. This is not a guarantee of your account's entitlement, availability or the same output. No new account or spend is authorized by this example.

Coordinator lookup, 2026-09-08: [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [comparison](https://developers.openai.com/api/docs/models/compare), [Responses](https://developers.openai.com/api/reference/cli/resources/responses/methods/create). Reported standard list prices per million tokens: Luna input $0.20, cached input $0.02, output $1.20; Sol $4, $0.40, $20. Sol reports no free API tier and, above 272,000 input tokens, full-request multipliers of 2× input and 1.5× output. Luna's long-context details and account-specific entitlements remain unknown. These references are not gateway invoices.

## Qualification Disclosures

The setup operator, Astra low, supplied the page/config/request and external editing/Clear checks. The checks passed. A deliberate qualification assertion failed with exit 1 and retained a screenshot/trace; this was not an agent implementation defect. An owned occupied-port listener was refused without being disturbed. Both browser runs exited and their servers closed.

A stock-Pi canary read an intentionally absent file and a sentinel. Its tool error, successful read and terminal event are preserved. The timestamp helper used the wrong Bun path; `/usr/bin/time` retained 4.39 seconds and the session retained timestamps. Task launches use the verified Node path. Member check/build initially lacked dependencies; the operator installed them from the frozen lock and both passed. These were setup interventions, not Luna's task work.

Complete receipts and the immutable supplied-file inventory are in `evidence/S4/` and `S4-manifest.json`. The standalone starter omits those receipts and qualification assertions so they cannot become the task's supplied solution or tests.

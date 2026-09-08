# Complete Record

Start with the [short reading](reading.md), or [replay/use the saved note](REPLAY.md). This detail separates supplied setup, experimental work and later editorial/checking work. Condition **extend-note**, attempt **E1**, is distinct from the exhausted original campaign. No production article UI changed.

## Supplied Context

Astra low, the setup/editorial operator, supplied the [working page](starter/app/index.html), [behavior request](starter/REQUEST.md), pinned dependencies and [stock Playwright config](starter/playwright.config.ts). There was no persistence solution, SPEC or behavioral test body in the kit. See [setup and public-provider limits](SETUP.md), [six-file frozen inventory](S4-manifest.json) and [S4 receipts](evidence/S4/).

The initial kit was committed as `9c1a7bff4ff72162aedd73e4ecf36957df349fae`. Its [standalone archive](https://raw.githubusercontent.com/dylanebert/agentic-engineering/9c1a7bff4ff72162aedd73e4ecf36957df349fae/examples/note-persistence/starter.tar.gz) and [checksum](https://raw.githubusercontent.com/dylanebert/agentic-engineering/9c1a7bff4ff72162aedd73e4ecf36957df349fae/examples/note-persistence/starter.tar.gz.sha256) were downloaded into a clean external copy. Installs succeeded, editing/Clear passed, a deliberate qualification assertion failed with retained artifacts, and owned browser/server processes closed. This was setup verification, not E1's persistence test.

Stock Pi 0.85.1, Playwright 1.62.1 and http-server 14.1.1 were used. Node v26.7.0, Bun 1.4.0, GNU timeout and Python 3.14.6 were preinstalled. Luna used Python only to remove the Clear write in the disposable regression copy; that additional runtime prerequisite is visible in the [actual shell operation](evidence/E1/implementation/implementation-operations.jsonl), not hidden behind the browser command. Saved-check replay does not need Python.

## Conversations And Assistance

The spec conversation used `ai-gw-openai/openai/gpt-5.6-luna`, low effort. Its [prompt](evidence/E1/spec/spec-prompt.txt), [launch](evidence/E1/spec/E1-spec.sh), [persistent session](evidence/E1/spec/spec.jsonl), [event stream](evidence/E1/spec/spec-events.jsonl) and [generated SPEC](final/SPEC.md) are retained. It read only the request and supplied page, then wrote SPEC.md. No implementation, test or browser work happened in that conversation.

A fresh Luna-low implementation conversation received the supplied kit plus SPEC.md, not the earlier transcript. The operator's [implementation prompt](evidence/E1/implementation/implementation-prompt.txt) required tests first, real browser operation, saved snapshots and logs, repeated fresh runs and the later labeled regression qualification. This operational scaffolding was supplied help; it was not invented by Luna. The source and tests themselves were Luna's work.

Two process launches failed before an implementation session/header appeared. The shell reported `time: signal: Invalid argument`. No-model controls reproduced the failure with `pi --version` and the long argument; a short argument and stdin succeeded. Astra changed only prompt transport to Pi's documented stdin interface. The [failed launches and controls](evidence/E1/setup-repair/) and [corrected launch](evidence/E1/implementation/E1-implementation.sh) remain beside the [unchanged prompt hash](evidence/E1/setup-repair/S4-launch-correction.json). There was no task-result replay, model fallback, new task condition or budget reset.

The [implementation session](evidence/E1/implementation/implementation.jsonl), [complete stock stream](evidence/E1/implementation/implementation-events.jsonl), [operation inventory](evidence/E1/implementation/implementation-operations.jsonl) and [full tool/result audit](evidence/E1/implementation/implementation-audit.json) retain all actual operations. The session authored [four tests](final/tests/note.spec.ts), ran them on the starter, made [one source edit](final/app/index.html), and ran every recorded task-browser check. No test was edited after its first run. Its [RESULT](final/RESULT.md) is an agent report; the raw results below establish the outcomes.

## Browser Results

Command from the external implementation workspace: `bunx --no-install playwright test --config playwright.config.ts`, with the frozen config and isolated browser-cache path. Chromium was 151.0.7922.34. Every run used fresh Playwright contexts; the tests additionally cleared storage before their sequence and kept the same context/origin through reloads.

| Snapshot/run | Result | Raw source |
|---|---|---|
| Supplied page | Exit 1; 3 pass, 1 fail, 0 skip. Saved text was empty after reload; editing/Clear passed. | [starter red](evidence/E1/task/receipts/starter-red-results/playwright.json) |
| Implemented, first fresh start | Exit 0; 4 pass, 0 fail/skip. | [run 1](evidence/E1/task/receipts/good-run-1-results/playwright.json) |
| Implemented, second fresh start | Exit 0; 4 pass, 0 fail/skip. | [run 2](evidence/E1/task/receipts/good-run-2-results/playwright.json) |
| Later disposable regression | Exit 1; 3 pass, 1 fail, 0 skip. Clear reloaded as “to be cleared” rather than empty. | [regression](evidence/E1/task/regression/receipts/regression-results/playwright.json) |
| Untouched implemented page, after regression | Exit 0; 4 pass, 0 fail/skip. | [final good](evidence/E1/task/receipts/good-final-results/playwright.json) |

The suite contains nine Playwright assertions across four tests. Startup/selector failures are not counted as behavioral negatives. The starter's Clear/reload test passed even without persistence because nothing was saved yet; that pass alone did not prove persisted Clear. The later deliberate regression preserved save/restore and exposed the returning old text at the actual textbox assertion. This is why the failure's location matters.

[Boundary snapshots](evidence/E1/task/receipts/) preserve the original page, test creation, implemented page and disposable mutation. The regression removed only the Clear action's storage write. Tests were unchanged. Each run's `.log`, `.exit` and copied results preserve failures, screenshots/traces when failing, browser PIDs and graceful closure. The regression is a qualification of the saved checks, not a claim that the agent originally introduced that bug.

## Context And Accounting

Sessions ran outside kex with cleared environment, isolated HOME/config/temp directories and stock built-in tools. Extensions, skills, templates, themes, context-file discovery, retries and compaction were disabled. Credentials and transcripts stayed outside the task/static roots without workspace links back. The spec session had read/write; implementation had read/write/edit/bash. No custom agent runtime, recorder, MCP or browser bridge was used.

The actual audit includes shell reads, copies, redirections, generated results and dependency copies, not just named read calls. All source/receipt/regression writes stayed in the owned task. The eight implementation shell calls performed enumeration, snapshots, browser commands, a Python mutation inside the disposable copy, and a final port check. There were no reads of earlier transcripts, private config or outside source. Ordinary shell access was not containment, and the subjects were instructed not to inspect session/environment files.

| Role | Requests | Tools | Reported tokens | Process seconds |
|---|---:|---:|---:|---:|
| Luna-low spec | 3 | 3 | 3,862 | 7.18 |
| Luna-low implementation | 15 | 30 | 192,254 | 66.86 |
| Failed implementation startups | No session/header | 0 recorded | No usage record | 0.02 charged conservatively |
| Sol-low review | 4 | 14 | 23,073 | 26.51 |

Through review, E1 has spent **100.57 of 600 seconds** ([machine-readable account](campaign.json)). No model corrective follow-up or human refinement has occurred; one operator setup correction is disclosed above.

Usage sums each authoritative assistant message once, including final messages: spec input/output/cache-read/cache-write = 832/389/1,167/1,474; implementation = 45/3,322/164,434/24,453. Failed test exits are preserved in files even though the agent's shell wrapper deliberately returned 0 after recording them. There were no failed implementation tool calls. Review input/output/cache-read/cache-write = 818/1,104/9,486/11,665. Across E1's three conversations: 22 requests, 47 tools and 219,189 reported tokens.

The S4 stock-Pi canary took 4.39 setup seconds: three requests, two reads (one intentional missing-file error), 2,265 reported tokens (2,151 input, 114 output, no cache tokens). Setup/editorial time and qualification are separate from E1's clock. Gateway billing is unknown; zero cost metadata is not free usage. Public list prices and their limits are references in [SETUP](SETUP.md), not an observed bill or a proof of direct-provider execution parity.

The first S4 commit omitted 13 log files because Git ignored them. The committed-archive evidence test refused that incomplete inventory; the logs still existed locally. Astra added a task-local log exception and explicitly retained ignored evidence paths, including the later task's copied results. [Archive failure and omitted-path list](evidence/archive-repair/) preserve the packaging error. The corrected `2705f334` archive passed all 12 evidence tests and the comparison; this repair did not change task source or results.

The public reader archive at `2705f3340a45424aa3cf447a1d59177b224e06cc` was then downloaded into a new directory, checksum-verified and installed without a model or article dependencies. Its saved tests passed 4/4 with no skips. A separate bounded local-server probe served the exact final page and refused access to package.json, then closed. [Replay and use-route receipts](evidence/replay/) bind the artifact bytes, command, results and teardown. This proves saved-check replay, not another model's reproduction.

## Independent And Human Judgment

One fresh read-only Sol-low review found no consequential gap. It checked the request, source, tests, outcomes and draft explanation using only the new bounded corpus. It specifically distinguished the required empty textbox from an unrequested requirement that a storage key remain present. [Full review](evidence/review/review-response.md), [prompt](evidence/review/review-prompt.txt), [stock session](evidence/review/review.jsonl), [events](evidence/review/review-events.jsonl) and [actual read audit](evidence/review/review-audit.json) are retained; its 131-file input corpus was unchanged. No second review or model correction followed.

Dylan confirmed functional use, not educational acceptance. After using the note on Omarchy, he said “it works.” The coordinator supplied a bounded Mac-to-Omarchy SSH reverse tunnel because the initial Mac-local link was not on Dylan's machine. This was access setup, not a task-browser check or E1 model work; the exact user browser engine is not established. [Human feedback and access attribution](human/feedback.json) records the distinction.

Dylan then rejected the [previous short reading](https://github.com/dylanebert/agentic-engineering/blob/0b266edc701e3e37c71c3bb1a7ad2d91643a630b/examples/note-persistence/reading.md) as “a little bit in the weeds” and asked for the surrounding article's conciseness, progressive disclosure, multimodal reinforcement and earned explanation. Both standalone readings were rejected; functional success is not prose acceptance. Astra made only an editorial revision, not another experiment or Sol review.

Dylan rejected the [revised reading](https://github.com/dylanebert/agentic-engineering/blob/0b90c9f8a7bf3bf3e6f37c4cb5bf2aa45dd16caf/examples/note-persistence/reading.md): “I'm not reading all that. it looks like your own internal notes. why should I care? my judgement should be on the structure of what's presented in the blog post.” This retires standalone review, not just that wording. Both readings remain immutable history.

No code refinement was requested. The separately scoped article-structure delivery owns the next in-post human look; no structural or visual acceptance is recorded. No new screenshot, embed or polished state is claimed. E1 is closed to further runs; unused clock is not a presentation budget.

## Historical Campaign And Limits

The original campaign exhausted all three attempts and its one setup adjustment. Its complete reading was rejected for verbosity, not accepted or rerun here. Keep the immutable [original reading](https://github.com/dylanebert/agentic-engineering/blob/f99e97b5052d5a4652f1c70e387fbaaf63efa312/examples/dogfood/reading.md), [reader supplement](https://github.com/dylanebert/agentic-engineering/blob/f99e97b5052d5a4652f1c70e387fbaaf63efa312/examples/dogfood/reader-supplement.md) and [full original corpus](https://github.com/dylanebert/agentic-engineering/tree/f99e97b5052d5a4652f1c70e387fbaaf63efa312/examples/dogfood) separate from extend-note E1.

The original pilot read prior transcript bytes; later separated-setup runs retained tool failures and an outside-folder write. Original simulations printed values rather than supplying these agent-operated browser assertions. Their repaired disclosures and immutable manifests remain in the old corpus. The new run does not erase those qualifications or establish model rankings.

This note stores text only in the same browser context and origin. It is not an account, backup or sync service. Denied storage, cross-tab coordination and other browser engines are outside the correctness claim. Replaying saved code/tests proves artifact/check replay, not that another model reproduces the recipe. This delivery retains both campaigns and the rejected readings, not an accepted lesson or successful recipe. Future article judgment is separate from this evidence record.

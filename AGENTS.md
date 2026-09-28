# Agentic Engineering consumer contract

The active
root is an application: it supports the uncommitted local source override and immutable
candidate staging. There is no saved
link, local directory, short ref, mutable tag, or artifact stage. Stable published exit is
not admitted until a compatible Shallot release exists.

## Entry and verification

The application owns `index.html`, `vite.config.ts`, and its checks. Vite runs and builds the
site; Bun runs the cheap test population and project checks. Use:

```sh
"$BUN" run test
"$BUN" run check
"$BUN" run build
```

`test` runs the cheap `*.test.ts` suite. `check` runs Svelte and TypeScript checks. The
Playwright-driven `hero`, `runtime`, `instrument`, and `shot` commands are separate evidence
producers, not part of the default test tier. Use `bun run instrument -- --runtime-witnesses
--project <project> --grep <exact-title>` for one runtime witness and `bun run shot` for the
shot gate; run the full `bun run instrument` population only when an active spec names it.
General Playwright evidence is diagnostic and is not a Shallot frame claim.

Live Shallot claims use only public package exports and the public
`captureFrame` contract: `final-canvas 1280x720@1 rgba8-tight`. Capture drivers fix that
geometry and record real Chromium adapter identity. Missing WebGPU, a software/fallback
adapter, missing display, or missing build output refuses; no CPU reconstruction,
private source import, copied transport, or unsupported state is evidence. Frozen
experiment records under `examples/**/evidence` are historical general Playwright and
agent evidence.

## Identity proof and state transitions

Record producer and consumer HEAD/dirt, then SHA-256 hashes of `package.json` and
`bun.lock`. Local entry runs `bun link` in the Shallot producer and
`bun link @dylanebert/shallot --no-save` here. The installed package realpath must equal
the producer, while manifest and lock hashes remain unchanged. Exit local state with
`bun install --force --frozen-lockfile --cache-dir <new-empty-cache>`, prove the realpath
is no producer path and the manifest, lock, installed metadata, and full SHA agree, then
rerun the focused gate. Candidate staging uses a newly empty explicit cache and
`bun install --frozen-lockfile --cache-dir <cache>`; source identity is the complete
40-hex SHA in both manifest and lock. Temporary caches, packs, captures, and generated
projects belong under `/tmp`.

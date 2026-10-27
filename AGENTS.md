# Agentic Engineering

The root is a Vite/Svelte application. The hero uses the pinned registry packages
`@dylanebert/shallot` 0.10.1 and `@dylanebert/shallot-ascii` 0.1.0 through public exports.
Do not substitute a local link.

## Checks

```sh
bun install --frozen-lockfile
bun run test
bun check
bun run typecheck
bun run build
```

`test` includes the hero's GPU scene test using `openGpuApp`; it requires WebGPU.
`bun check` checks TypeScript; `typecheck` runs Svelte diagnostics.

For page appearance, run Chromium against `vite preview` and inspect all three hero
treatments at desktop and 390 px width. The camera follows the first canvas's client
box; do not pin a separate rendering resolution. Browser screenshots are page
appearance evidence, not a GPU scene test. Keep temporary browser drivers and
screenshots under `/tmp`.

Frozen records under `examples/**/evidence` are historical post content; retain them.

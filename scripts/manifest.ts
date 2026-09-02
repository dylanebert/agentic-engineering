// Typecheck shim. figures.spec.ts reads the figure manifest as its external expectation; in the
// gate's staged work dir that module is src/lib/figures.ts, copied in as manifest.ts by
// scripts/figures.ts. This re-export is what the same import resolves to in-repo, so the spec
// typechecks against the real declaration and runs against a byte copy of it.
export * from "../src/lib/figures";

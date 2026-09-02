// Typecheck shim, the same shape as manifest.ts. figures.spec.ts reads the palette declaration
// as the role-binding arm's external expectation; in the gate's staged work dir that module is
// src/lib/vocabulary.ts, copied in as vocabulary.ts by scripts/figures.ts and scripts/
// instrument.ts. This re-export is what the same import resolves to in-repo.
export * from "../src/lib/vocabulary";

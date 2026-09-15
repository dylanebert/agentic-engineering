import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const examples = join(root, "examples");
const legacyChecks = [
  "scripts/figures-manifest.test.ts",
  "scripts/import-gate.test.ts",
  "scripts/shot-route.test.ts",
  "scripts/vocabulary.oracle.ts",
  "scripts/substrate.oracle.ts",
];
const parked = join("/tmp", `agentic-engineering-carrier-${process.pid}`);
const command = process.argv[2];
if (!command || !["list", "check", "test", "workflow"].includes(command)) {
  throw new Error("carrier usage: list|check|test|workflow [options]");
}

// The historical experiment corpus contains intentionally independent Bun evidence tests. The
// installed Shallot carrier owns this application's declared population, not those frozen records.
// Park the directory only for the duration of the installed-bin call; bytes and paths are restored
// in finally, including on a failed carrier invocation.
mkdirSync(parked, { recursive: true });
if (existsSync(examples)) renameSync(examples, join(parked, "examples"));
for (const relative of legacyChecks) {
  const source = join(root, relative);
  if (existsSync(source)) {
    const destination = join(parked, relative);
    mkdirSync(join(destination, ".."), { recursive: true });
    renameSync(source, destination);
  }
}
try {
  const bin = join(root, "node_modules", ".bin", "shallot");
  const result = Bun.spawnSync([bin, command, ...process.argv.slice(3)], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exitCode = result.exitCode ?? 1;
} finally {
  for (const relative of legacyChecks) {
    const source = join(parked, relative);
    if (existsSync(source)) renameSync(source, join(root, relative));
  }
  const parkedExamples = join(parked, "examples");
  if (existsSync(parkedExamples)) renameSync(parkedExamples, examples);
  if (existsSync(parked)) rmSync(parked, { recursive: true, force: true });
}

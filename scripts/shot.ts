import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { campaign } from "./campaign";
const update = process.env.UPDATE_SNAPSHOTS === "1" || process.argv.includes("--update-snapshots");
const work = await campaign("capture", []);
if (work) {
  const repo = join(import.meta.dir, "..");
  const shots = join(repo, "shots");
  if (existsSync(shots)) cpSync(shots, join(work, "preserved-shots"), { recursive: true });
  mkdirSync(shots, { recursive: true });
  const captures = new Map<string, string>();
  function visit(path: string) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (["desktop.png", "mobile.png"].includes(entry.name)) captures.set(entry.name, child);
    }
  }
  visit(join(work, "test-results"));
  for (const name of ["desktop.png", "mobile.png"]) {
    if (!captures.has(name)) throw new Error(`capture output missing: ${name}`);
    cpSync(captures.get(name)!, join(shots, name));
  }
  if (update) cpSync(join(work, "capture.spec.ts-snapshots"), join(import.meta.dir, "capture.spec.ts-snapshots"), { recursive: true });
}

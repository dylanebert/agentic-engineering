import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

function findLock(start: string): string {
  let directory = start;
  while (true) {
    const candidate = join(directory, "bun.lock");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(directory);
    if (parent === directory) throw new Error("playwright-version: bun.lock not found");
    directory = parent;
  }
}

const lockPath = findLock(import.meta.dir);
const lock = readFileSync(lockPath, "utf8");
const match = lock.match(/^\s*"@playwright\/test": \["@playwright\/test@([^\"]+)"/m);

if (!match || !/^\d+\.\d+\.\d+$/.test(match[1])) {
  throw new Error(`playwright-version: bun.lock has no exact @playwright/test version (${lockPath})`);
}

/** Exact Playwright version resolved by this project's lockfile for staged runners. */
export const playwrightVersion = match[1];

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const repo = join(import.meta.dir, "..");
const dependency = "@dylanebert/shallot";
const expectedTypegpu = "~0.12.4";
const expectedPlugin = "~0.12.3";
const requiredPayload = [
  "src/extras/cells/core.ts",
  "dist/vite.js",
  "dist/harness-browser.js",
];

function sha256(path: string): string {
  const hash = new Bun.CryptoHasher("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function verify(root: string): void {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const spec = manifest.dependencies?.[dependency];
  if (typeof spec !== "string" || !spec.startsWith("file:vendor/") || spec.slice(5).includes("..")) {
    throw new Error(`Shallot dependency must be an exact relative file: path under vendor/, got ${String(spec)}`);
  }
  if (manifest.dependencies?.typegpu !== expectedTypegpu) throw new Error(`typegpu must be ${expectedTypegpu}`);
  if (manifest.dependencies?.["unplugin-typegpu"] !== expectedPlugin) throw new Error(`unplugin-typegpu must be ${expectedPlugin}`);

  const tarName = basename(spec.slice(5));
  const match = /^shallot-(\d+\.\d+\.\d+)-([0-9a-f]{7})\.tgz$/.exec(tarName);
  if (!match) throw new Error(`Shallot tarball name must carry version and seven-character source commit: ${tarName}`);
  const tarPath = join(root, spec.slice(5));
  const stem = tarName.slice(0, -4);
  const source = readFileSync(join(root, "vendor", `${stem}.source-commit`), "utf8").trim();
  if (!/^[0-9a-f]{40}$/.test(source) || source.slice(0, 7) !== match[2]) throw new Error("tarball name and source-commit record disagree");
  const checksum = readFileSync(join(root, "vendor", `${stem}.sha256`), "utf8").trim();
  if (checksum !== `${sha256(tarPath)}  ${tarName}`) throw new Error("vendored Shallot SHA-256 does not match committed bytes");

  const lock = readFileSync(join(root, "bun.lock"), "utf8");
  if (!lock.includes(`\"${dependency}\": \"file:vendor/${tarName}\"`) || !lock.includes(`${dependency}@vendor/${tarName}`)) {
    throw new Error("bun.lock does not resolve the exact vendored Shallot artifact");
  }
  const installed = join(root, "node_modules", dependency);
  for (const path of requiredPayload) readFileSync(join(installed, path));
}

function mutation(name: string, mutate: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "agentic-engineering-substrate-"));
  try {
    for (const path of ["package.json", "bun.lock", "vendor", "node_modules"]) cpSync(join(repo, path), join(root, path), { recursive: true });
    mutate(root);
    let red = false;
    try { verify(root); } catch { red = true; }
    if (!red) throw new Error(`mutation stayed green: ${name}`);
    console.log(`mutation red: ${name}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

verify(repo);
console.log("substrate: article manifest, lock, provenance, checksum, and installed payload agree");
const manifest = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
const tarName = basename(manifest.dependencies[dependency].slice(5));
mutation("flip tarball byte with checksum unchanged", (root) => {
  const path = join(root, "vendor", tarName);
  const bytes = readFileSync(path);
  bytes[bytes.length - 1] ^= 1;
  writeFileSync(path, bytes);
});
mutation("strip Cells from installed payload", (root) => rmSync(join(root, "node_modules", dependency, requiredPayload[0])));
mutation("strip tooling export from installed payload", (root) => rmSync(join(root, "node_modules", dependency, requiredPayload[1])));
mutation("rewrite dependency as registry range", (root) => {
  const path = join(root, "package.json");
  const value = JSON.parse(readFileSync(path, "utf8"));
  value.dependencies[dependency] = "^0.10.0";
  writeFileSync(path, JSON.stringify(value, null, 2));
});
console.log("oracle-substrate: PASS");

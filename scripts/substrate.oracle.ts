import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dependency = "@dylanebert/shallot";
const candidate = "70770cfc34d82fdd19cb705d8753bb6f093748d6";
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const lock = readFileSync(join(root, "bun.lock"), "utf8");
const installedRoot = realpathSync(join(root, "node_modules", dependency));
const installed = JSON.parse(readFileSync(join(installedRoot, "package.json"), "utf8"));
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

if (manifest.dependencies?.[dependency] !== `github:dylanebert/shallot#${candidate}`)
  throw new Error("Shallot manifest is not the qualified full-SHA source identity");
if (!lock.includes(`github:dylanebert/shallot#${candidate}`))
  throw new Error("bun.lock does not record the qualified full-SHA source identity");
if (installed.name !== dependency || installed.version !== "0.10.0")
  throw new Error("installed Shallot metadata is not the candidate package");
if (installedRoot === join(root, "node_modules", dependency) && lstatSync(join(root, "node_modules", dependency)).isSymbolicLink())
  throw new Error("realpath proof found a producer symlink");
if (installedRoot.includes("/tmp/shallot-candidate") || installedRoot.includes("/projects/shallot"))
  throw new Error(`realpath proof found a producer path: ${installedRoot}`);
if (!/^[0-9a-f]{64}$/.test(hash(join(root, "package.json"))) || !/^[0-9a-f]{64}$/.test(hash(join(root, "bun.lock"))))
  throw new Error("manifest or lock hash was not computed");
console.log(JSON.stringify({ dependency, candidate, installedRoot, packageHash: hash(join(root, "package.json")), lockHash: hash(join(root, "bun.lock")) }));

import { campaign } from "./campaign";
const vocabulary = Bun.spawnSync(["bun", "scripts/vocabulary.oracle.ts"], { cwd: new URL("..", import.meta.url).pathname, stdout: "inherit", stderr: "inherit" });
if (vocabulary.exitCode !== 0) process.exit(vocabulary.exitCode);
await campaign("figure", []);

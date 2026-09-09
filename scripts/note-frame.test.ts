import { expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { figureArms } from "./arms";
import { bytes, closeBrowser, launch, namedRed, serve } from "./campaign";
import { figures } from "./manifest";
import { grammar } from "./vocabulary";

test("real note reader accepts saved local page and rejects each substituted subject", async () => {
  const root = await mkdtemp(join(tmpdir(), "note-frame-"));
  const dist = join(root, "dist");
  await mkdir(dist);
  const saved = await readFile(new URL("../examples/note-persistence/final/app/index.html", import.meta.url));
  const starter = await readFile(new URL("../examples/note-persistence/starter/app/index.html", import.meta.url));
  const frame = '<iframe title="Try the saved note" src="/agentic-engineering/note.html"></iframe>';
  const handle = await launch({}, "plain");
  try {
    for (const control of ["saved", "missing", "wrong", "extra", "starter"] as const) {
      await writeFile(join(dist, "index.html"), `<script>window.ready=true</script>${control === "missing" ? "" : control === "wrong" ? frame.replace("note.html", "starter.html") : control === "extra" ? frame + frame : frame}`);
      await writeFile(join(dist, "note.html"), control === "starter" ? starter : saved);
      await writeFile(join(dist, "starter.html"), starter);
      const server = await serve({ id: control, root, mode: "files", hashes: bytes(root) });
      const context = await handle.browser.newContext();
      try {
        const page = await context.newPage();
        const arms = figureArms({ root, dist, url: server.url, figures, grammar });
        await arms[0]!.run(undefined as never, undefined as never);
        const arm = arms.find(arm => arm.title === "note: sole frame serves the retained implementation");
        expect(arm).toBeDefined();
        const run = async () => { await arm!.run({ page, browser: handle.browser, request: context.request }, undefined as never); };
        if (control === "saved") await run();
        else await namedRed(control === "missing" || control === "extra" ? "note.frame-count" : control === "wrong" ? "note.frame-source" : "note.saved-bytes", run);
        console.log(`note frame control=${control} verified`);
      } finally { await context.close(); await server.close(); }
    }
  } finally { await closeBrowser(handle); await rm(root, { recursive: true }); }
}, 30000);

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { launch, closeBrowser } from '../../scripts/campaign';
import { inventory } from './evidence';

/** Observer only. Reuses the article's plain-browser launch/close lifecycle, not its GPU runner. */
export async function observe(root: string, serverScript: string, output: string, stage: number) {
  mkdirSync(output, { recursive: true });
  const before = inventory(root);
  const records: any[] = [];
  const record = (event: string, data = {}) => records.push({ at: new Date().toISOString(), event, ...data });
  const origin = 'http://127.0.0.1:8765';
  let handle: Awaited<ReturnType<typeof launch>> | undefined;
  let context: Awaited<ReturnType<Awaited<ReturnType<typeof launch>>['browser']['newContext']>> | undefined;
  const child = spawn('node', [serverScript, root, '-a', '127.0.0.1', '-p', '8765', '-c-1'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = '';
  child.stdout.on('data', b => { serverLog += b; }); child.stderr.on('data', b => { serverLog += b; });
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  record('start', { root, command: ['node', serverScript, root, '-a', '127.0.0.1', '-p', '8765', '-c-1'], origin, stage, hashes: before, node: process.version, serverPid: child.pid });
  let outcome = 'unavailable';
  try {
    // Confirm this process owns the listening socket before navigating; a pre-existing listener is not ours.
    const until = Date.now() + 10000;
    while (!serverLog.includes('Available on:')) {
      if (child.exitCode !== null || Date.now() > until) throw new Error('instrument: static server failed to bind');
      await new Promise(r => setTimeout(r, 50));
    }
    handle = await launch({}, 'plain');
    record('browser', { version: handle.browser.version(), pid: handle.pid });
    context = await handle.browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const response = await page.goto(origin);
    assert.equal(response?.status(), 200, 'instrument: page HTTP status');
    const field = page.getByRole('textbox');
    const clear = page.getByRole('button', { name: 'Clear', exact: true });
    if (await field.count() !== 1 || await clear.count() !== 1) throw new Error('behavior: expected one textbox and Clear button');
    async function value(id: string, expected: string) {
      const actual = await field.inputValue();
      const passed = actual === expected;
      record('assertion', { id, expected, actual, outcome: passed ? 'pass' : 'fail' });
      await page.screenshot({ path: join(output, id + '.png') });
      if (!passed) throw new Error('behavior: ' + id);
    }
    await value('empty-start', '');
    await field.fill('First line\nSecond line'); await value('multiline-edit', 'First line\nSecond line');
    await clear.click(); await value('clear', '');
    if (stage === 2) {
      await field.fill('Saved line\nKeep this'); await page.reload(); await value('saved-reload', 'Saved line\nKeep this');
      await field.fill('Edited note'); await page.reload(); await value('edited-reload', 'Edited note');
      await clear.click(); await value('clear-before-reload', '');
      await page.reload(); await value('empty-reload', '');
    }
    outcome = 'pass';
  } catch (error) {
    const message = String(error);
    outcome = message.includes('behavior:') ? 'fail' : 'unavailable';
    record('error', { message, outcome });
  } finally {
    try {
      try { if (context) { await context.close(); record('context-close'); } }
      finally { if (handle) { await closeBrowser(handle); record('browser-close'); } }
    } finally {
      if (child.exitCode === null) child.kill('SIGTERM');
      record('server-close', await exited as object);
      writeFileSync(join(output, 'server.log'), serverLog);
      const unchanged = JSON.stringify(inventory(root)) === JSON.stringify(before);
      record('end', { outcome, unchanged });
      writeFileSync(join(output, 'observations.json'), JSON.stringify(records, null, 2) + '\n');
      assert(unchanged, 'observer must not change input');
    }
  }
  return { outcome, records };
}

if (import.meta.main) {
  const [mode, rootArg, scriptArg, outputArg, stageArg] = process.argv.slice(2);
  assert(rootArg && scriptArg && outputArg, 'usage: browser.ts qualify|observe ROOT HTTP_SERVER_SCRIPT OUTPUT [1|2]');
  const root = resolve(rootArg), script = resolve(scriptArg), output = resolve(outputArg);
  if (mode === 'qualify') {
    const base = '<!doctype html><meta charset="utf-8"><label>Note<textarea id="note"></textarea></label><button id="clear">Clear</button><script>const n=document.querySelector("textarea");RESTORE;n.addEventListener("input",()=>{SAVE});document.querySelector("button").onclick=()=>{n.value="";CLEAR};</script>';
    for (const variant of ['correct', 'missing-save', 'missing-restore', 'nonpersisted-clear']) {
      const input = join(root, variant); mkdirSync(input, { recursive: true });
      writeFileSync(join(input, 'index.html'), base.replace('RESTORE', variant === 'missing-restore' ? '' : 'n.value=localStorage.getItem("note")??""').replace('SAVE', variant === 'missing-save' ? '' : 'localStorage.setItem("note",n.value)').replace('CLEAR', variant === 'nonpersisted-clear' ? '' : 'localStorage.setItem("note",n.value)'));
      const result = await observe(input, script, join(output, variant), 2);
      assert.equal(result.outcome, variant === 'correct' ? 'pass' : 'fail', variant);
      if (variant !== 'correct') assert(result.records.some(r => r.event === 'assertion' && r.id === (variant === 'nonpersisted-clear' ? 'empty-reload' : 'saved-reload') && r.outcome === 'fail'), 'control reaches expected assertion');
    }
    const broken = join(root, 'broken-setup'); mkdirSync(broken, { recursive: true });
    const failure = await observe(broken, join(root, 'absent-server.js'), join(output, 'broken-setup'), 2);
    assert.equal(failure.outcome, 'unavailable', 'setup is not a subject failure');
    console.log('qualification: correct pass; three behavioral controls fail at expected assertions; broken setup unavailable');
  } else {
    assert.equal(mode, 'observe'); assert(stageArg === '1' || stageArg === '2');
    const result = await observe(root, script, output, Number(stageArg));
    console.log('behavior:', result.outcome); process.exitCode = result.outcome === 'pass' ? 0 : result.outcome === 'fail' ? 1 : 2;
  }
}

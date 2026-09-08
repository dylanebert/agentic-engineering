import { test, expect } from 'bun:test';
import { mkdtempSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkBrowserReport, checkRecording, checkSnapshot, jsonl, sha } from './evidence';
import { checkFidelity, checkMainReading, mainReadingClaims, requiredDisclosures } from './fidelity';

const root = import.meta.dir;
const s4 = join(root, 'evidence/S4');
const manifest = JSON.parse(readFileSync(join(root, 'S4-manifest.json'), 'utf8'));
const e1 = join(root, 'evidence/E1');
const e1Manifest = JSON.parse(readFileSync(join(root, 'E1-manifest.json'), 'utf8'));
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

test('E1 archive and runnable final kit match complete pinned inventories', () => {
  checkSnapshot(e1, e1Manifest.receipts);
  checkSnapshot(join(root, 'final'), e1Manifest.final);
});

test('both fresh Luna conversations retain every call/result and final-message usage', () => {
  for (const [role, requests, tools] of [['spec', 3, 3], ['implementation', 15, 30]] as const) {
    const result = checkRecording(jsonl(join(e1, role, `${role}.jsonl`)), jsonl(join(e1, role, `${role}-events.jsonl`)), 'openai/gpt-5.6-luna');
    expect(result.requests).toBe(requests);
    expect(result.tools).toBe(tools);
    expect(result.toolErrors).toBe(0);
  }
});

test('starter red, two independent starts, persisted-Clear regression and final good', () => {
  const cases = [
    ['receipts/starter-red', 'text survives reload and replacement survives reload', '\"\"'],
    ['receipts/good-run-1'], ['receipts/good-run-2'],
    ['regression/receipts/regression', 'Clear survives reload and another Clear/reload remains empty', '\"to be cleared\"'],
    ['receipts/good-final'],
  ];
  for (const [prefix, title, received] of cases) {
    const file = join(e1, 'task', `${prefix}-results/playwright.json`);
    checkBrowserReport(readJson(file), title, received);
    const exitPath = join(e1, 'task', `${prefix}${prefix.endsWith('/regression') ? '-run' : ''}.exit`);
    expect(readFileSync(exitPath, 'utf8').trim()).toBe(title ? '1' : '0');
    const log = readFileSync(exitPath.replace(/\.exit$/, '.log'), 'utf8');
    expect(log).toContain('http-server stopped.');
    const launched = [...log.matchAll(/<launched> pid=(\d+)/g)].map(m => m[1]);
    expect(launched.length).toBeGreaterThan(0);
    for (const pid of launched) expect(log).toContain(`[pid=${pid}] <process did exit: exitCode=0, signal=null>`);
  }
});

test('source boundaries and all saved test copies stay bound to the served snapshots', () => {
  const text = (p: string) => readFileSync(join(root, p), 'utf8');
  expect(text('evidence/E1/task/receipts/before-tests-app-index.html')).toBe(text('starter/app/index.html'));
  expect(text('evidence/E1/task/receipts/starter-red-tests-app-index.html')).toBe(text('starter/app/index.html'));
  expect(text('evidence/E1/task/receipts/implemented-app-index.html')).toBe(text('final/app/index.html'));
  expect(text('evidence/E1/task/app/index.html')).toBe(text('final/app/index.html'));
  const suite = text('final/tests/note.spec.ts');
  for (const path of ['receipts/before-tests-tests/note.spec.ts', 'receipts/starter-red-tests/note.spec.ts', 'receipts/implemented-tests/note.spec.ts', 'receipts/regression-tests-note.spec.ts', 'regression/tests/note.spec.ts', 'tests/note.spec.ts']) {
    expect(sha(text('evidence/E1/task/' + path))).toBe(sha(suite));
  }
  const regression = text('final/app/index.html').replace("      localStorage.setItem(storageKey, '');\n", '');
  expect(regression).not.toBe(text('final/app/index.html'));
  expect(text('evidence/E1/task/regression/app/index.html')).toBe(regression);
});

test('a changed outcome or absent test cannot masquerade as the recorded run', () => {
  const good = readJson(join(e1, 'task/receipts/good-final-results/playwright.json'));
  good.suites[0].specs.pop();
  expect(() => checkBrowserReport(good)).toThrow('test population');
  const red = readJson(join(e1, 'task/regression/receipts/regression-results/playwright.json'));
  red.stats.unexpected = 0;
  expect(() => checkBrowserReport(red, 'Clear survives reload and another Clear/reload remains empty', '\"to be cleared\"')).toThrow('failing test population');
});

test('cumulative E1 clock and every role usage come from actual receipts', () => {
  const campaign = readJson(join(root, 'campaign.json'));
  let seconds = 0, tokens = 0, requests = 0, tools = 0;
  for (const phase of campaign.conversations) {
    const dir = phase.role === 'review' ? join(root, 'evidence/review') : join(e1, phase.role);
    const measured = Number(readFileSync(join(dir, `${phase.role}-stderr.log`), 'utf8').match(/^real ([0-9.]+)$/m)?.[1]);
    expect(measured).toBe(phase.seconds);
    expect(readFileSync(join(dir, `${phase.role}.exit`), 'utf8').trim()).toBe('0');
    const start = Date.parse(readFileSync(join(dir, `${phase.role}-start.txt`), 'utf8').trim());
    const end = Date.parse(readFileSync(join(dir, `${phase.role}-end.txt`), 'utf8').trim());
    expect(end).toBeGreaterThan(start);
    const result = checkRecording(jsonl(join(dir, `${phase.role}.jsonl`)), jsonl(join(dir, `${phase.role}-events.jsonl`)), phase.model);
    expect(result.usage.totalTokens).toBe(phase.tokens);
    expect(result.requests).toBe(phase.requests); expect(result.tools).toBe(phase.tools);
    seconds += measured; tokens += phase.tokens; requests += phase.requests; tools += phase.tools;
  }
  let failedCharge = 0;
  for (const name of ['implementation-launch-failure', 'implementation-launch-failure-2']) {
    const dir = join(e1, 'setup-repair', name);
    expect(readFileSync(join(dir, 'implementation.exit'), 'utf8').trim()).toBe('1');
    expect(readFileSync(join(dir, 'implementation-events.jsonl'), 'utf8')).toBe('');
    const measured = Number(readFileSync(join(dir, 'implementation-stderr.log'), 'utf8').match(/^real ([0-9.]+)$/m)?.[1]);
    failedCharge += Math.max(0.01, measured);
  }
  expect(failedCharge).toBe(campaign.failedStartupChargeSeconds);
  expect(Number((seconds + failedCharge).toFixed(2))).toBe(campaign.spentSeconds);
  expect(campaign.spentSeconds).toBeLessThan(campaign.limitSeconds);
  expect({ tokens, requests, tools }).toEqual({ tokens: 219189, requests: 22, tools: 47 });
  expect(campaign.modelCorrectiveFollowUps).toBe(0); expect(campaign.humanRefinements).toBe(0);
  expect(campaign.historicalCampaign.attemptsConsumed).toBe(3);
});

test('public saved-kit replay and use route bind to unchanged final bytes', () => {
  const manifest = readJson(join(root, 'replay-manifest.json'));
  const dir = join(root, 'evidence/replay');
  checkSnapshot(dir, manifest.receipts);
  expect(sha(readFileSync(join(root, 'reader.tar.gz')))).toBe(manifest.archiveSha256);
  checkBrowserReport(readJson(join(dir, 'results/playwright.json')));
  expect(readFileSync(join(dir, 'browser.exit'), 'utf8').trim()).toBe('0');
  const use = readJson(join(dir, 'use-route.json'));
  expect(use.observation).toEqual({ status: 200, sameFinalBytes: true, sha256: sha(readFileSync(join(root, 'final/app/index.html'))), outsideStatus: 404 });
  expect(readFileSync(join(dir, 'use-route.log'), 'utf8')).toContain('http-server stopped.');
  expect(readJson(join(dir, 'credential-cleanup.json')).removed).toBe(true);
});

test('fresh Sol review is read-only, complete and bound to its unchanged corpus', () => {
  const dir = join(root, 'evidence/review');
  checkSnapshot(dir, readJson(join(root, 'review-manifest.json')).receipts);
  const events = jsonl(join(dir, 'review-events.jsonl'));
  const result = checkRecording(jsonl(join(dir, 'review.jsonl')), events, 'openai/gpt-5.6-sol');
  expect(result.requests).toBe(4); expect(result.tools).toBe(14); expect(result.toolErrors).toBe(0);
  for (const call of events.filter(e => e.type === 'tool_execution_start')) expect(call.toolName).toBe('read');
  const before = readJson(join(dir, 'review-before-inventory.json'));
  const after = readJson(join(dir, 'review-after-inventory.json'));
  expect(Object.keys(before.files).length).toBe(131);
  expect(after.files).toEqual(before.files);
});

test('shorter reading preserves every semantic obligation and the actual human quote', () => {
  const reading = readFileSync(join(root, 'reading.md'), 'utf8');
  const human = readJson(join(root, 'human/feedback.json'));
  checkMainReading(reading, human);
  for (const [meaning, clause] of mainReadingClaims) expect(() => checkMainReading(reading.replace(clause, ''), human)).toThrow(`main reading ${meaning}`);
  expect(() => checkMainReading(reading.replace('“it works.”', '“the explanation is accepted.”'), human)).toThrow('actual human quote');
  expect(readJson(join(root, 'campaign.json')).humanDecision).toBe('functional use confirmed; revised-reading feedback pending');
});

test('whole source population and both campaign identities have visible dispositions', () => {
  const detail = readFileSync(join(root, 'detail.md'), 'utf8');
  const mapping = readJson(join(root, 'sources.json'));
  const result = checkFidelity(root, detail, mapping);
  expect(result.sources).toBeGreaterThan(150);
  expect(result.historicalFiles).toBeGreaterThan(387);
  for (const clause of requiredDisclosures) expect(() => checkFidelity(root, detail.replace(clause, ''), mapping)).toThrow('missing consequential disclosure');
  expect(() => checkFidelity(root, detail.replace('Exit 0; 4 pass, 0 fail/skip.', 'Exit 1; failed.'), mapping)).toThrow('three green outcome dispositions');
  const intervention = mapping.find((r: any) => r.file.endsWith('S4-launch-correction.json'));
  expect(intervention).toBeDefined();
  expect(() => checkFidelity(root, detail, mapping.filter((r: any) => r !== intervention))).toThrow('complete source coverage');
});

test('production comparison CLI refuses a removed intervention and changed outcome', () => {
  const copy = mkdtempSync(join(tmpdir(), 'note-fidelity-witness-'));
  const captures = join(root, 'references');
  try {
    cpSync(root, copy, { recursive: true });
    const original = readFileSync(join(copy, 'detail.md'), 'utf8');
    const cases = [
      ['unchanged', original, 0, ''],
      ['removed-intervention', original.replace(requiredDisclosures[2]!, ''), 1, 'missing consequential disclosure'],
      ['changed-outcome', original.replace('Exit 0; 4 pass, 0 fail/skip.', 'Exit 1; failed.'), 1, 'three green outcome dispositions'],
      ['restored', original, 0, ''],
    ] as const;
    for (const [name, content, exit, predicate] of cases) {
      writeFileSync(join(copy, 'detail.md'), content);
      const child = Bun.spawnSync(['bun', join(copy, 'compare.ts'), captures], { stdout: 'pipe', stderr: 'pipe' });
      expect(child.exitCode).toBe(exit);
      if (predicate) expect(child.stderr.toString()).toContain(predicate);
      console.log(`fidelity CLI ${name}: exit ${child.exitCode}; ${predicate || 'complete source and prose checks'}`);
    }
    const reading = readFileSync(join(copy, 'reading.md'), 'utf8');
    writeFileSync(join(copy, 'reading.md'), reading.replace('The tests passed.', 'The tests failed.'));
    const changed = Bun.spawnSync(['bun', join(copy, 'compare.ts'), captures], { stdout: 'pipe', stderr: 'pipe' });
    expect(changed.exitCode).toBe(1);
    expect(changed.stderr.toString()).toContain('main reading machine outcome');
    writeFileSync(join(copy, 'reading.md'), reading);
    const restored = Bun.spawnSync(['bun', join(copy, 'compare.ts'), captures], { stdout: 'pipe', stderr: 'pipe' });
    expect(restored.exitCode).toBe(0);
    console.log(`fidelity CLI changed-main-outcome: exit ${changed.exitCode}; restored ${restored.exitCode}`);
  } finally { rmSync(copy, { recursive: true }); }
});

test('frozen supplied starter and complete S4 receipt population', () => {
  expect(Object.keys(manifest.starter).length).toBe(6);
  checkSnapshot(join(root, 'starter'), manifest.starter);
  checkSnapshot(s4, manifest.receipts);
});

test('stock recording retains an actual missing-file error and successful read', () => {
  const result = checkRecording(jsonl(join(s4, 'session.jsonl')), jsonl(join(s4, 'events.jsonl')), 'openai/gpt-5.6-luna');
  expect(result.tools).toBe(2);
  expect(result.toolErrors).toBe(1);
  expect(result.requests).toBe(3);
});

test('missing actual tool result and terminal event refuse', () => {
  const session = jsonl(join(s4, 'session.jsonl'));
  const events = jsonl(join(s4, 'events.jsonl'));
  const id = events.find(e => e.type === 'tool_execution_end').toolCallId;
  expect(() => checkRecording(session, events.filter(e => !(e.type === 'tool_execution_end' && e.toolCallId === id)), 'openai/gpt-5.6-luna')).toThrow('tool end');
  expect(() => checkRecording(session.filter(e => !(e.type === 'message' && e.message.role === 'toolResult' && e.message.toolCallId === id)), events, 'openai/gpt-5.6-luna')).toThrow('tool result population');
  expect(() => checkRecording(session, events.slice(0, -1), 'openai/gpt-5.6-luna')).toThrow('terminal event');
});

test('a changed served snapshot refuses, then untouched starter still passes', () => {
  const copy = mkdtempSync(join(tmpdir(), 'note-snapshot-witness-'));
  try {
    cpSync(join(root, 'starter'), copy, { recursive: true });
    writeFileSync(join(copy, 'app/index.html'), '<textarea>different snapshot</textarea>');
    expect(() => checkSnapshot(copy, manifest.starter)).toThrow('snapshot bytes and inventory');
  } finally { rmSync(copy, { recursive: true }); }
  checkSnapshot(join(root, 'starter'), manifest.starter);
});

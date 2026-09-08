import { test, expect } from 'bun:test';
import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { checkEditorial, originalLimit, supplementBlock } from './editorial';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkRecording, checkSnapshot, inventory, jsonl } from './evidence';
import { checkMapping, type Mapping } from './mapping';
const root = join(import.meta.dir, 'corpus');
const index = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8'));

test('nonempty stock corpus, frozen snapshots and completed process exits', () => {
  expect(index.taskAttempts).toBe(1);
  expect(index.recordings.map((r: any) => r.id)).toEqual(['qualification', 'pilot/spec', 'pilot/stage-one', 'pilot/stage-two']);
  expect(index.snapshots.length).toBe(10);
  for (const recording of index.recordings) {
    expect(recording.exit).toBe(0);
    const counts = checkRecording(jsonl(join(root, recording.session)), jsonl(join(root, recording.events)));
    expect(counts.tools).toBeGreaterThan(0);
  }
  for (const snapshot of index.snapshots) checkSnapshot(join(root, snapshot.path), snapshot.hashes);
});

test('recording qualifies a successful tool and deliberate error, not a task failure', () => {
  const session = jsonl(join(root, 'qualification/session.jsonl'));
  const counts = checkRecording(session, jsonl(join(root, 'qualification/events.jsonl')));
  expect(counts.tools).toBe(2); expect(counts.toolErrors).toBe(1);
  const results = session.filter(e => e.message?.role === 'toolResult');
  expect(JSON.stringify(results)).toContain('recording-ok');
  expect(JSON.stringify(results)).toContain('deliberate-recording-error');
  expect(JSON.stringify(results)).toContain('code 7');
});

test('missing result and missing terminal stream are rejected', () => {
  const session = jsonl(join(root, 'qualification/session.jsonl'));
  const events = jsonl(join(root, 'qualification/events.jsonl'));
  const omitted = session.find(e => e.message?.role === 'toolResult');
  expect(() => checkRecording(session.filter(e => e !== omitted), events)).toThrow('tool result population');
  expect(() => checkRecording(session, events.slice(0, -1))).toThrow('terminal event');
});

test('a changed snapshot fails the actual filesystem reader', () => {
  const snapshot = index.snapshots.find((s: any) => s.id === 'initial');
  const temporary = mkdtempSync(join(tmpdir(), 'dogfood-snapshot-witness-'));
  try {
    cpSync(join(root, snapshot.path), temporary, { recursive: true });
    checkSnapshot(temporary, snapshot.hashes);
    writeFileSync(join(temporary, 'task.txt'), 'Changed task\n');
    expect(() => checkSnapshot(temporary, snapshot.hashes)).toThrow('snapshot bytes and inventory');
  } finally { rmSync(temporary, { recursive: true }); }
});

test('pilot starts from the frozen kit and browser results bind to unchanged stage sources', () => {
  const initial = index.snapshots.find((s: any) => s.id === 'initial');
  const before = index.snapshots.find((s: any) => s.id === 'pilot/before-spec');
  expect(before.hashes).toEqual(initial.hashes);
  for (const stage of ['stage-one', 'stage-two']) {
    const snapshot = index.snapshots.find((s: any) => s.id === 'pilot/' + stage);
    const records = JSON.parse(readFileSync(join(root, 'pilot', stage, 'browser/observations.json'), 'utf8'));
    expect(records[0].hashes).toEqual(snapshot.hashes);
    expect(records[0].origin).toBe('http://127.0.0.1:8765');
    expect(records.at(-1)).toMatchObject({ outcome: 'pass', unchanged: true });
    expect(records.filter((r: any) => r.event === 'assertion').length).toBe(stage === 'stage-one' ? 3 : 7);
    for (const close of ['context-close', 'browser-close', 'server-close']) expect(records.some((r: any) => r.event === close)).toBe(true);
  }
  const summary = JSON.parse(readFileSync(join(root, 'pilot/summary.json'), 'utf8'));
  expect(summary.correctiveFollowUps).toBe(0);
  expect(summary.subjectWallSeconds).toBeLessThan(600);
  for (const conversation of summary.conversations) {
    const actual = checkRecording(jsonl(join(root, 'pilot', conversation.id, 'session.jsonl')), jsonl(join(root, 'pilot', conversation.id, 'events.jsonl')));
    expect(actual.usage).toEqual(conversation.usage);
    expect(actual.tools).toBe(conversation.tools);
    expect(actual.requests).toBe(conversation.requests);
  }
});

test('final observer lifecycle rechecks retain every original behavior and control outcome', () => {
  for (const id of ['stage-one', 'stage-two', 'qualification/correct', 'qualification/missing-save', 'qualification/missing-restore', 'qualification/nonpersisted-clear', 'qualification/broken-setup']) {
    const recheck = JSON.parse(readFileSync(join(root, 'rechecks', id, 'observations.json'), 'utf8'));
    const originalPath = id.startsWith('qualification/') ? id.replace('qualification/', 'qualification/browser/') : 'pilot/' + id + '/browser';
    const original = JSON.parse(readFileSync(join(root, originalPath, 'observations.json'), 'utf8'));
    expect(recheck.at(-1).outcome).toBe(original.at(-1).outcome);
    expect(recheck[0].hashes).toEqual(original[0].hashes);
    expect(recheck.filter((r: any) => r.event === 'assertion').map(({ at, ...r }: any) => r)).toEqual(original.filter((r: any) => r.event === 'assertion').map(({ at, ...r }: any) => r));
    expect(recheck.some((r: any) => r.event === 'server-close')).toBe(true);
  }
});

test('all retained corpus bytes match the frozen artifact manifest', () => {
  checkSnapshot(root, JSON.parse(readFileSync(join(import.meta.dir, 'corpus.sha256.json'), 'utf8')));
});

test('separated attempts start fresh and retain every recorded failure and browser boundary', () => {
  const corpus = join(import.meta.dir, 'adjusted-corpus');
  const adjusted = JSON.parse(readFileSync(join(corpus, 'index.json'), 'utf8'));
  expect(adjusted.attempts.map((a: any) => a.attempt)).toEqual([2, 3]);
  checkSnapshot(corpus, JSON.parse(readFileSync(join(import.meta.dir, 'adjusted-corpus.sha256.json'), 'utf8')));
  expect(Object.keys(inventory(corpus)).length).toBe(223);
  expect(adjusted.snapshots.length).toBe(8);
  const kit = inventory(join(import.meta.dir, 'adjusted-reader'));
  expect(kit).toEqual(adjusted.kit);
  for (const snapshot of adjusted.snapshots) checkSnapshot(join(corpus, snapshot.path), snapshot.hashes);
  for (const attempt of adjusted.attempts) {
    expect(attempt.correctiveFollowUps).toBe(0);
    expect(attempt.subjectWallSeconds).toBeLessThan(600);
    const before = inventory(join(corpus, attempt.id, 'snapshots/before-spec'));
    expect(Object.keys(before).sort()).toEqual(['stage-one.txt', 'stage-two.txt', 'task.txt']);
    for (const name of Object.keys(before)) expect(before[name]).toBe(kit['app/' + name]);
    let elapsed = 0;
    for (const conversation of attempt.conversations) {
      const dir = join(corpus, attempt.id, conversation.id);
      const actual = checkRecording(jsonl(join(dir, 'session.jsonl')), jsonl(join(dir, 'events.jsonl')));
      expect(actual).toEqual({ requests: conversation.requests, tools: conversation.tools, toolErrors: conversation.toolErrors, usage: conversation.usage });
      const time = Number(readFileSync(join(dir, 'time.txt'), 'utf8').match(/real ([\d.]+)/)![1]);
      expect(time).toBe(conversation.subjectWallSeconds);
      expect(Number(readFileSync(join(dir, 'exit.txt'), 'utf8'))).toBe(0);
      const command = JSON.parse(readFileSync(join(corpus, 'commands.json'), 'utf8')).find((c: any) => c.attempt === attempt.id && c.stage === conversation.id);
      expect(command.remaining).toBe(Math.floor(600 - elapsed));
      elapsed += time;
    }
    expect(elapsed).toBe(attempt.subjectWallSeconds);
    for (const stage of ['stage-one', 'stage-two']) {
      const hashes = inventory(join(corpus, attempt.id, 'snapshots', stage));
      const original = JSON.parse(readFileSync(join(corpus, attempt.id, 'receipts', stage + '-browser/observations.json'), 'utf8'));
      const final = JSON.parse(readFileSync(join(corpus, attempt.id, 'receipts', stage + '-browser-final/observations.json'), 'utf8'));
      for (const observations of [original, final]) {
        expect(observations[0].hashes).toEqual(hashes);
        expect(observations[0].origin).toBe('http://127.0.0.1:8765');
        expect(observations.at(-1)).toMatchObject({ outcome: 'pass', unchanged: true });
        expect(observations.filter((e: any) => e.event === 'assertion').length).toBe(stage === 'stage-one' ? 3 : 7);
        for (const close of ['context-close', 'browser-close', 'server-close']) expect(observations.some((r: any) => r.event === close)).toBe(true);
      }
      expect(final.filter((e: any) => e.event === 'assertion').map(({ at, ...r }: any) => r)).toEqual(original.filter((e: any) => e.event === 'assertion').map(({ at, ...r }: any) => r));
    }
  }
  const canary = checkRecording(jsonl(join(corpus, 'qualification/canary/session.jsonl')), jsonl(join(corpus, 'qualification/canary/events.jsonl')));
  expect(canary.tools).toBe(2); expect(canary.toolErrors).toBe(1);
  expect(adjusted.attempts.map((a: any) => a.conversations.reduce((n: number, c: any) => n + c.toolErrors, 0))).toEqual([3, 1]);
  const teardown = JSON.parse(readFileSync(join(corpus, 'teardown.json'), 'utf8'));
  expect(teardown.credentialsRemoved).toBe(true);
  expect(teardown.processRecords.length).toBe(25);
  expect(teardown.processRecords.every((p: any) => !p.alive)).toBe(true);
  const html = readFileSync(join(corpus, 'adjusted/snapshots/stage-two/index.html'), 'utf8');
  expect(readFileSync(join(corpus, 'adjusted/receipts/subject-note-script.js'), 'utf8')).toBe(html.match(/<script>([\s\S]*?)<\/script>/)![1]);
});

test('finite reading maps all frozen sources and shows exact quotations and recipe', () => {
  const mapping = JSON.parse(readFileSync(join(import.meta.dir, 'mapping.json'), 'utf8'));
  const reading = readFileSync(join(import.meta.dir, 'reading.md'), 'utf8');
  expect(checkMapping(import.meta.dir, mapping, reading)).toEqual({ sources: 876, mappings: 876, quotations: 2 });
  expect(reading).toContain(readFileSync(join(import.meta.dir, 'adjusted-reader/README.md'), 'utf8'));
  for (const name of ['task.txt', 'stage-one.txt', 'stage-two.txt']) expect(reading).toContain(readFileSync(join(import.meta.dir, 'adjusted-reader/app', name), 'utf8'));
});

test('checker-only mutations remove a real repair and change a browser outcome through the CLI', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'dogfood-mapping-witness-'));
  const original: Mapping[] = JSON.parse(readFileSync(join(import.meta.dir, 'mapping.json'), 'utf8'));
  try {
    const repair = 'adjusted-corpus/replay/stage-two/session.jsonl#d098c486';
    expect(original.filter(r => r.id === repair).length).toBe(1);
    const removed = original.filter(r => r.id !== repair);
    const changed = structuredClone(original);
    const outcome = changed.find(r => r.file === 'adjusted-corpus/replay/receipts/stage-two-browser/observations.json' && r.outcome === 'pass');
    expect(outcome).toBeDefined(); outcome!.outcome = 'fail';
    for (const [name, rows, expectedExit] of [['unchanged', original, 0], ['removed-repair', removed, 1], ['changed-outcome', changed, 1]] as const) {
      const file = join(temporary, name + '.json'); writeFileSync(file, JSON.stringify(rows));
      const child = Bun.spawnSync(['bun', join(import.meta.dir, 'mapping.ts'), '--mapping', file], { stdout: 'pipe', stderr: 'pipe' });
      const output = child.stdout.toString() + child.stderr.toString();
      expect(child.exitCode).toBe(expectedExit);
      if (expectedExit) expect(output).toContain('mapping source coverage/order/outcome');
      console.log(`checker fixture ${name}: exit=${child.exitCode}; ${expectedExit ? 'mapping source coverage/order/outcome refused' : '876 mapped sources accepted'}`);
    }
  } finally { rmSync(temporary, { recursive: true }); }
});

test('review omissions remain visible, with real deletion negatives', () => {
  const reading = readFileSync(join(import.meta.dir, 'reading.md'), 'utf8');
  const mapping = JSON.parse(readFileSync(join(import.meta.dir, 'mapping.json'), 'utf8'));
  checkEditorial(import.meta.dir, reading, mapping);
  const supplement = readFileSync(join(import.meta.dir, 'reader-supplement.md'), 'utf8');
  expect(() => checkEditorial(import.meta.dir, reading.replace(supplement, ''), mapping)).toThrow('complete post-run supplement is inline');
  expect(() => checkEditorial(import.meta.dir, reading.replace(originalLimit, ''), mapping)).toThrow('original simulation limit is visible');
  const changed = structuredClone(mapping);
  changed.find((r: any) => r.id.endsWith('#62b4ce9c')).disposition = 'Consult source for full details.';
  expect(() => checkEditorial(import.meta.dir, reading, changed)).toThrow('original simulation explicit disposition');
  const source = jsonl(join(root, 'pilot/stage-two/session.jsonl'));
  const command = source.find(e => e.id === '62b4ce9c').message.content.find((c: any) => c.type === 'toolCall').arguments.command;
  expect(command).toContain('const badNote = { value:"", addEventListener(){}, focus(){} };');
  expect(command).not.toMatch(/assert[.(]|throw new Error\("(?:expected|mismatch)/);
  expect(source.find(e => e.id === '2251be77').message.content[0].text).toContain('storage-unavailable page loaded without crash');
  expect(source.find(e => e.id === '9b32f330').message.content.some((c: any) => c.text?.includes('editing still works ✅'))).toBe(true);
});

test('post-run editorial fixture executes snapshot, cumulative budget and exit recording commands, never a model', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'dogfood-editorial-fixture-'));
  const app = join(temporary, 'app'), support = join(temporary, 'support');
  mkdirSync(app); mkdirSync(support); mkdirSync(join(support, 'records')); mkdirSync(join(support, 'snapshots'));
  writeFileSync(join(app, 'task.txt'), 'editorial fixture, not a subject task\n');
  const text = readFileSync(join(import.meta.dir, 'reader-supplement.md'), 'utf8');
  const env = { ...process.env, APP: app, SUPPORT: support, CLEAN_PATH: '/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin' };
  const run = (command: string, extra = {}) => Bun.spawnSync(['/bin/bash', '-c', command], { env: { ...env, ...extra }, stdout: 'pipe', stderr: 'pipe' });
  try {
    expect(run(supplementBlock(text, 'prerequisites')).exitCode).toBe(0);
    expect(readFileSync(join(support, 'prerequisites.exit'), 'utf8').trim()).toBe('0');
    expect(readFileSync(join(support, 'prerequisites.txt'), 'utf8')).toContain('Python');
    const snapshot = supplementBlock(text, 'snapshot');
    expect(run(snapshot).exitCode).toBe(0);
    expect(JSON.parse(readFileSync(join(support, 'snapshots/before-spec.json'), 'utf8')).hashes).toEqual(inventory(app));
    const repeated = run(snapshot);
    expect(repeated.exitCode).not.toBe(0);
    expect(repeated.stderr.toString()).toContain('snapshot destination must be absent');
    for (const [stage, time] of [['spec', '54.05'], ['stage-one', '88.47']]) {
      mkdirSync(join(support, 'records', stage!)); writeFileSync(join(support, 'records', stage!, 'time.txt'), `real ${time}\n`);
    }
    const budget = supplementBlock(text, 'budget') + '\nprintf "%s" "$REMAINING"';
    const cumulative = run(budget); expect(cumulative.exitCode).toBe(0); expect(cumulative.stdout.toString()).toBe('457');
    writeFileSync(join(support, 'records/stage-one/time.txt'), 'real 600\n');
    expect(run(budget).exitCode).not.toBe(0);
    writeFileSync(join(support, 'records/stage-one/time.txt'), 'missing time\n');
    expect(run(budget).exitCode).not.toBe(0);
    const fixture = join(support, 'fixture.js');
    writeFileSync(fixture, 'console.log("editorial command fixture, not Pi"); process.exit(7);\n');
    const launch = run(supplementBlock(text, 'launch'), { STAGE: 'fixture', PROMPT: 'task.txt', REMAINING: '5', NODE: 'node', PI: fixture, LIMIT: 'gtimeout', CLEAN_PATH: process.env.PATH!, MODEL: 'NO_MODEL' });
    expect(launch.exitCode).toBe(0); // shell recorded the failure; it did not replace it with success
    const dir = join(support, 'records/fixture');
    expect(readFileSync(join(dir, 'exit.txt'), 'utf8').trim()).toBe('7');
    for (const file of ['start.txt', 'end.txt']) expect(readFileSync(join(dir, file), 'utf8')).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(readFileSync(join(dir, 'time.txt'), 'utf8')).toMatch(/^real\s+[0-9.]+/m);
    expect(readFileSync(join(dir, 'events.jsonl'), 'utf8')).toContain('editorial command fixture, not Pi');
    console.log('editorial fixture: snapshot pass; overwrite refused; cumulative=457; exhausted/missing timing refused; exit 7 preserved; zero model requests');
  } finally { rmSync(temporary, { recursive: true }); }
});

test('browser controls distinguish three defects from a setup failure', () => {
  for (const [id, outcome, failed] of [
    ['correct', 'pass', null], ['missing-save', 'fail', 'saved-reload'],
    ['missing-restore', 'fail', 'saved-reload'], ['nonpersisted-clear', 'fail', 'empty-reload'],
    ['broken-setup', 'unavailable', null],
  ]) {
    const records = JSON.parse(readFileSync(join(root, 'qualification/browser', id!, 'observations.json'), 'utf8'));
    expect(records.at(-1).outcome).toBe(outcome);
    expect(records.some((r: any) => r.event === 'server-close')).toBe(true);
    if (failed) expect(records.some((r: any) => r.event === 'assertion' && r.id === failed && r.outcome === 'fail')).toBe(true);
    if (id === 'correct') expect(records.filter((r: any) => r.event === 'assertion').length).toBe(7);
  }
});

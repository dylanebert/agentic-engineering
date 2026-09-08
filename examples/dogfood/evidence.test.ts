import { test, expect } from 'bun:test';
import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkRecording, checkSnapshot, jsonl } from './evidence';
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

import { test, expect } from 'bun:test';
import { mkdtempSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkRecording, checkSnapshot, jsonl } from './evidence';

const root = import.meta.dir;
const s4 = join(root, 'evidence/S4');
const manifest = JSON.parse(readFileSync(join(root, 'S4-manifest.json'), 'utf8'));

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

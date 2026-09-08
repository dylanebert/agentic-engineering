import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export function inventory(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  function visit(dir: string, prefix = '') {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) visit(join(dir, entry.name), name + '/');
      else { assert(entry.isFile(), `unsupported snapshot entry: ${name}`); files[name] = sha(readFileSync(join(dir, entry.name))); }
    }
  }
  visit(root);
  return files;
}
export function checkSnapshot(root: string, expected: Record<string, string>) {
  assert(Object.keys(expected).length > 0, 'snapshot population');
  assert.deepEqual(inventory(root), expected, 'snapshot bytes and inventory');
}
export function jsonl(path: string): any[] {
  const text = readFileSync(path, 'utf8');
  assert(text.endsWith('\n'), 'unterminated JSONL');
  return text.trimEnd().split('\n').map(line => JSON.parse(line));
}
/** Adapted from the retained dogfood reader; stock messages are authoritative, not streaming deltas. */
export function checkRecording(session: any[], events: any[], model: string) {
  assert.equal(session[0]?.type, 'session', 'session header');
  assert.equal(events[0]?.id, session[0].id, 'stream/session identity');
  assert(session.some(e => e.type === 'thinking_level_change' && e.thinkingLevel === 'low'), 'effective effort');
  assert(session.some(e => e.type === 'model_change' && e.provider === 'ai-gw-openai' && e.modelId === model), 'frozen model');
  const messages = session.filter(e => e.type === 'message').map(e => e.message);
  assert.equal(messages.filter(m => m.role === 'user').length, 1, 'one initial prompt');
  const assistants = messages.filter(m => m.role === 'assistant');
  assert(assistants.length > 0, 'request population');
  assert.equal(assistants.at(-1).stopReason, 'stop', 'terminal assistant');
  assert.equal(events.at(-1)?.type, 'agent_settled', 'terminal event');
  assert.equal(events.filter(e => e.type === 'agent_end' && e.willRetry === false).length, 1, 'terminal agent end');
  assert.deepEqual(events.filter(e => e.type === 'message_end' && e.message.role === 'assistant').map(e => e.message), assistants, 'authoritative messages');
  const calls = assistants.flatMap(m => m.content.filter((c: any) => c.type === 'toolCall'));
  assert(calls.length > 0, 'tool population');
  assert.equal(new Set(calls.map(c => c.id)).size, calls.length, 'unique calls');
  const results = messages.filter(m => m.role === 'toolResult');
  assert.equal(results.length, calls.length, 'tool result population');
  for (const call of calls) {
    const result = results.filter(r => r.toolCallId === call.id);
    assert.equal(result.length, 1, `missing result: ${call.id}`);
    const starts = events.filter(e => e.type === 'tool_execution_start' && e.toolCallId === call.id);
    const ends = events.filter(e => e.type === 'tool_execution_end' && e.toolCallId === call.id);
    assert.equal(starts.length, 1, 'tool start'); assert.equal(ends.length, 1, 'tool end');
    assert.deepEqual(starts[0].args, call.arguments, 'tool arguments');
    assert.equal(ends[0].isError, result[0].isError, 'tool failure fidelity');
    assert.deepEqual(ends[0].result.content, result[0].content, 'tool output fidelity');
  }
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 };
  for (const message of assistants) for (const key of Object.keys(usage) as (keyof typeof usage)[]) {
    assert(Number.isFinite(message.usage[key]), `usage ${key}`); usage[key] += message.usage[key];
  }
  return { requests: assistants.length, tools: calls.length, toolErrors: results.filter(m => m.isError).length, usage };
}

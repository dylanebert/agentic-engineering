import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { checkFidelity, sourceGroups } from './fidelity';
import { sha } from './evidence';

const root = import.meta.dir;
const captures = process.argv[2];
assert(captures, 'usage: bun examples/note-persistence/compare.ts CAPTURE_ROOT');
const text = (name: string) => readFileSync(join(root, name), 'utf8');
const mapping = JSON.parse(text('sources.json'));
console.log('=== MAIN READING ONLY ===\n' + text('reading.md'));
console.log('=== OPTIONAL COMPLETE DETAIL ===\n' + text('detail.md'));
console.log('=== OPTIONAL SETUP ===\n' + text('SETUP.md'));
console.log('=== OPTIONAL REPLAY/USE ===\n' + text('REPLAY.md'));
console.log('=== SOURCE COVERAGE ===');
console.log(checkFidelity(root, text('detail.md'), mapping));
for (const [group, section, disposition] of sourceGroups) console.log(JSON.stringify({ group, section, disposition, files: mapping.filter((r: any) => r.file.startsWith(group + '/')).length }));
for (const row of mapping) console.log(JSON.stringify(row));
console.log('=== USER-SELECTED SURROUNDING ARTICLE AND VISUAL BEAT ===');
console.log(text('references/article-context.json'));
console.log('=== HUMAN-MARKED REFERENCES; NOT A TASTE SCORE ===');
for (const [file, channel] of [
  ['taste-loops-latency-figure.txt', 'concise prose; not page styling'],
  ['adaptive-ml-rl-visualized.html', 'reduced-scope explanatory sequence'],
  ['adaptive-ml-speculative-decoding.html', 'optional advanced disclosure, not graphics effort'],
  ['karpathy-training-recipe.txt', 'concrete failure/check motivation, not a required model bug'],
]) {
  const path = resolve(captures, file);
  const body = readFileSync(path, 'utf8');
  assert(body.length > 0, 'nonempty marked capture');
  console.log(JSON.stringify({ file, channel, sha256: sha(body) }));
  console.log(body);
}
console.log('=== WHOLE EDITORIAL PROSE TRIPWIRES ===');
console.log('Population: reading, detail, setup, replay and both supplied request copies. Frozen transcripts and generated SPEC/RESULT documents are attributed source excerpts, not edited prose.');
const findings: string[] = [];
for (const file of ['reading.md', 'detail.md', 'SETUP.md', 'REPLAY.md', 'starter/REQUEST.md', 'final/REQUEST.md']) {
  const body = text(file).replace(/```[\s\S]*?```/g, '');
  const words = body.match(/\S+/g) ?? [];
  const relativizers = body.match(/\b(?:that|which|who|whom|whose)\b/gi) ?? [];
  const rate = relativizers.length / words.length * 1000;
  body.split(/\n\s*\n/).forEach((paragraph, index) => {
    if (/^\s*(?:#|\||[-*]|\d+\.)/.test(paragraph)) return;
    const count = (paragraph.match(/\S+/g) ?? []).length;
    if (count > 79) findings.push(`${file} paragraph ${index + 1}: ${count} words >79`);
  });
  if (rate >= 12) findings.push(`${file}: ${rate.toFixed(2)} relativizers/1000 >=12`);
  console.log(JSON.stringify({ file, words: words.length, relativizers: relativizers.length, rate }));
}
console.log(JSON.stringify({ findings, limits: 'Lexical length/relative-word tripwires do not certify concision, educational clarity or taste. Human feedback is still owed.' }, null, 2));
if (findings.length) process.exitCode = 1;

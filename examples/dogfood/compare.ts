import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sha } from './evidence';
import { checkMapping } from './mapping';

const root = import.meta.dir;
const captures = resolve(process.argv[2] ?? 'MISSING_CAPTURE_ROOT');
const reading = readFileSync(join(root, 'reading.md'), 'utf8');
const mapping = JSON.parse(readFileSync(join(root, 'mapping.json'), 'utf8'));
console.log('Source-linked reading:', checkMapping(root, mapping, reading));
console.log('Reading SHA-256:', sha(reading));
console.log(reading);
for (const name of ['karpathy-training-recipe.txt', 'adaptive-ml-rl-visualized.html', 'taste-loops-latency-figure.txt']) {
  const text = readFileSync(join(captures, name), 'utf8');
  console.log('\nMARKED CAPTURE', name, 'SHA-256', sha(text), '\n' + text);
}
const prose = reading.replace(/```[\s\S]*?```/g, '').replace(/^\|.*$/gm, '').replace(/^>.*$/gm, '').replace(/\[[^\]]+\]\([^)]*\)/g, match => match.slice(1, match.indexOf(']'))).replace(/<[^>]*>/g, '');
const words = (text: string) => text.match(/\b[\w'-]+\b/g) ?? [];
const paragraphs = prose.split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !p.startsWith('#') && !/^\d\.|^-/.test(p));
const long = paragraphs.filter(p => words(p).length > 79).map(p => ({ words: words(p).length, start: p.slice(0, 100) }));
const candidates = prose.match(/\b(that|which|who|whom|whose|where|when)\b/gi) ?? [];
console.log('\nPROSE TRIPWIRES', JSON.stringify({ longParagraphs: long, words: words(prose).length, lexicalRelativizerCandidates: candidates.length, candidatesPerThousand: 1000 * candidates.length / words(prose).length, limitation: 'Lexical candidates include non-relative uses; human/rule reviewer classifies them. Excludes code, tables and block quotations; includes supplied recipe prose.' }, null, 2));
if (long.length) process.exitCode = 1;

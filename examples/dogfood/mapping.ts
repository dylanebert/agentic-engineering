import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha, jsonl, checkSnapshot } from './evidence';

export type Source = { id: string; file: string; hash: string; locator: string; outcome: string | null };
export type Mapping = Source & { reading: string; disposition: string };

/** Enumerates every frozen file plus each persistent/session or browser observation entry.
 * Stream files are retained whole as the delta-level counterpart of persistent messages. */
export function sources(root: string): Source[] {
  const result: Source[] = [];
  for (const corpus of ['corpus', 'adjusted-corpus']) {
    const manifest = JSON.parse(readFileSync(join(root, corpus + '.sha256.json'), 'utf8'));
    checkSnapshot(join(root, corpus), manifest);
    for (const name of Object.keys(manifest).sort()) {
      const file = corpus + '/' + name;
      const bytes = readFileSync(join(root, file));
      result.push({ id: file, file, hash: sha(bytes), locator: 'whole-file', outcome: null });
      let entries: any[] = [];
      if (name.endsWith('/session.jsonl') || name.endsWith('/transitions.jsonl')) entries = jsonl(join(root, file));
      if (name.endsWith('/observations.json') || name === 'actions.json') entries = JSON.parse(bytes.toString());
      for (const [index, entry] of entries.entries()) {
        const locator = entry.id && !name.endsWith('/observations.json') ? String(entry.id) : String(index);
        const outcome = entry.outcome ?? (entry.message?.role === 'toolResult' ? (entry.message.isError ? 'fail' : 'pass') : null);
        result.push({ id: file + '#' + locator, file, hash: sha(JSON.stringify(entry)), locator, outcome });
      }
    }
  }
  assert.equal(new Set(result.map(r => r.id)).size, result.length, 'unique source IDs');
  return result;
}

/** Structural fidelity only. A fresh reader must judge whether a paraphrase hides work. */
export function checkMapping(root: string, mapping: Mapping[], reading: string) {
  const expected = sources(root);
  assert(expected.length > 600, 'source population floor');
  assert.deepEqual(mapping.map(({ reading: _r, disposition: _d, ...source }) => source), expected, 'mapping source coverage/order/outcome');
  for (const item of mapping) {
    assert(reading.includes('id="' + item.reading + '"'), 'reading destination: ' + item.id);
    assert(item.disposition.trim().length > 10, 'discoverable disposition');
  }
  const quotations = JSON.parse(readFileSync(join(root, 'quotations.json'), 'utf8'));
  assert(quotations.length >= 2, 'quotation population');
  for (const quote of quotations) {
    const entry = jsonl(join(root, quote.file)).find(e => e.id === quote.entry);
    assert(entry, 'quotation source');
    assert(entry.message.content.some((c: any) => c.type === 'text' && c.text.includes(quote.text)), 'quotation bytes');
    assert(reading.includes(quote.text), 'quotation shown');
  }
  return { sources: expected.length, mappings: mapping.length, quotations: quotations.length };
}

if (import.meta.main) {
  const root = import.meta.dir;
  const override = process.argv.indexOf('--mapping');
  const map = JSON.parse(readFileSync(override < 0 ? join(root, 'mapping.json') : process.argv[override + 1]!, 'utf8'));
  const reading = readFileSync(join(root, 'reading.md'), 'utf8');
  console.log(JSON.stringify(checkMapping(root, map, reading)));
  if (process.argv.includes('--print')) console.log(reading);
}

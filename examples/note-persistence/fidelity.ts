import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inventory } from './evidence';

export const sourceGroups = [
  ['starter', 'supplied-context', 'Supplied edit/Clear kit; no persistence, SPEC or assertion bodies.'],
  ['final', 'browser-results', 'Luna-authored spec, source, unchanged tests and result; public replay inputs.'],
  ['evidence/S4', 'supplied-context', 'Setup-only acquisition, initial behavior, intentional error and lifecycle qualification; includes operator repairs.'],
  ['evidence/acquisition', 'supplied-context', 'Pinned published starter download, checksum, clean install and repeated setup-only browser qualification.'],
  ['evidence/E1/spec', 'conversations-and-assistance', 'Spec-only Luna-low prompt, launch, complete stock conversation and source audit.'],
  ['evidence/E1/implementation', 'conversations-and-assistance', 'Fresh Luna-low implementation, all actual calls/results and usage, including browser operations.'],
  ['evidence/E1/setup-repair', 'conversations-and-assistance', 'Two pre-session failures, no-model controls and disclosed unchanged-prompt stdin rescue.'],
  ['evidence/E1/task', 'browser-results', 'Served snapshots, unchanged assertions, starter red, repeated green, later labeled Clear regression and final green.'],
  ['evidence/review', 'independent-and-human-judgment', 'Single Sol-low read-only review, exact draft inputs, complete messages and unchanged input audit; no consequential finding.'],
  ['evidence/replay', 'context-and-accounting', 'Clean public reader acquisition, no-model four-test replay, bounded use-route probe, original archive check and owned cleanup.'],
  ['evidence/archive-repair', 'context-and-accounting', 'First committed S4 archive refused missing ignored logs; operator explicitly retains full evidence without changing task bytes.'],
  ['references', 'historical-campaign-and-limits', 'Unchanged human-marked capture excerpts: prose, reduced sequence and optional disclosure, not a generated taste score.'],
] as const;
export function sources(root: string) {
  return sourceGroups.flatMap(([group, section, disposition]) => Object.entries(inventory(join(root, group))).map(([file, sha256]) => ({ file: `${group}/${file}`, sha256, section, disposition })));
}
export const requiredDisclosures = [
  'There was no persistence solution, SPEC or behavioral test body in the kit.',
  'This operational scaffolding was supplied help; it was not invented by Luna.',
  'Two process launches failed before an implementation session/header appeared.',
  'Astra changed only prompt transport to Pi\'s documented stdin interface.',
  'The starter\'s Clear/reload test passed even without persistence because nothing was saved yet;',
  'This is why the failure\'s location matters.',
  'The regression is a qualification of the saved checks, not a claim that the agent originally introduced that bug.',
  'one operator setup correction is disclosed above.',
  'Gateway billing is unknown;',
  'The first S4 commit omitted 13 log files because Git ignored them.',
  'Its saved tests passed 4/4 with no skips.',
  'One fresh read-only Sol-low review found no consequential gap.',
  'Actual human use and educational feedback are pending.',
  'The original campaign exhausted all three attempts and its one setup adjustment.',
  'Its complete reading was rejected for verbosity, not accepted or rerun here.',
  'The original pilot read prior transcript bytes;',
  'Original simulations printed values rather than supplying these agent-operated browser assertions.',
  'Replaying saved code/tests proves artifact/check replay, not that another model reproduces the recipe.',
];
/** Source coverage is mechanical; an independent reviewer separately judged semantic fidelity. */
export function checkFidelity(root: string, detail: string, mapping: ReturnType<typeof sources>) {
  assert.deepEqual(mapping, sources(root), 'complete source coverage and disposition');
  for (const clause of requiredDisclosures) assert(detail.includes(clause), `missing consequential disclosure: ${clause}`);
  assert.equal(detail.split('Exit 0; 4 pass, 0 fail/skip.').length - 1, 3, 'three green outcome dispositions');
  assert.equal(detail.split('Exit 1; 3 pass, 1 fail, 0 skip.').length - 1, 2, 'two red outcome dispositions');
  const reading = readFileSync(join(root, 'reading.md'), 'utf8');
  assert(reading.includes('All four tests passed on two fresh starts.'), 'main reading machine outcome');
  assert(reading.includes('it found no consequential gap.'), 'main reading agent outcome');
  assert(reading.includes('still pending'), 'main reading human boundary');
  const pin = 'f99e97b5052d5a4652f1c70e387fbaaf63efa312';
  assert(detail.includes(`${pin}/examples/dogfood/reading.md`), 'old reading pin');
  assert(detail.includes(`${pin}/examples/dogfood/reader-supplement.md`), 'old supplement pin');
  const history = JSON.parse(readFileSync(join(root, 'history-manifest.json'), 'utf8'));
  assert.equal(history.commit, pin, 'old campaign identity');
  assert.equal(Object.keys(history.files).filter(p => p.startsWith('corpus/')).length, 164, 'entire original corpus');
  assert.equal(Object.keys(history.files).filter(p => p.startsWith('adjusted-corpus/')).length, 223, 'entire adjusted corpus');
  assert(history.files['reading.md'] && history.files['reader-supplement.md'], 'retained rejected reading and supplement');
  return { sources: mapping.length, historicalFiles: Object.keys(history.files).length };
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Mapping } from './mapping';

export const originalLimit = 'The original simulation printed values rather than asserting equality. Its storage-denied arm demonstrated loading without a crash, not editing or clearing under denied storage, despite the final response’s claim.';

/** Known omission regressions, not a replacement semantic/taste review. */
export function checkEditorial(root: string, reading: string, mapping: Mapping[]) {
  const supplement = readFileSync(join(root, 'reader-supplement.md'), 'utf8');
  assert(reading.includes(supplement), 'complete post-run supplement is inline');
  assert(reading.includes(originalLimit), 'original simulation limit is visible');
  for (const id of ['62b4ce9c', '9b32f330']) {
    const row = mapping.find(r => r.id === 'corpus/pilot/stage-two/session.jsonl#' + id);
    assert(row?.disposition.includes(originalLimit), 'original simulation explicit disposition');
  }
}

export function supplementBlock(text: string, name: string) {
  const marker = '<!-- supplement:' + name + ' -->';
  assert(text.includes(marker), 'supplement command block ' + name);
  const match = text.slice(text.indexOf(marker)).match(/```sh\n([\s\S]*?)\n```/);
  assert(match, 'shell command block');
  return match[1];
}

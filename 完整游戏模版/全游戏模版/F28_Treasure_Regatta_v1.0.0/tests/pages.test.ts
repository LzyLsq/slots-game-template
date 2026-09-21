import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readablePages } from '../assets/scripts/ui/Pages';

test('rules paginate without losing or duplicating words', () => {
  const body = ('243 possible ways; there are no fixed paylines.\n\nMatch at least three consecutive columns from the left.\n').repeat(20);
  const pages = readablePages(body);
  assert.deepEqual(pages.join(' ').split(/\s+/).filter(Boolean), body.split(/\s+/).filter(Boolean));
  assert.ok(pages.every(page => page.split('\n').length <= 8));
  assert.ok(pages.every(page => page.split('\n').every(line => line.length <= 30)));
});
test('empty pages and invalid layout budgets are handled', () => {
  assert.deepEqual(readablePages(''), ['']);
  assert.throws(() => readablePages('rules', 30, 0));
  assert.throws(() => readablePages('rules', -1, 8));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractMarkdownLinks,
  isLocalMarkdownLink,
  verifyRepo,
  REQUIRED_FILES
} from '../scripts/check-docs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

test('extractMarkdownLinks returns markdown link targets', () => {
  const text = '[doc](README.md) and [community](https://example.com)';
  assert.deepEqual(extractMarkdownLinks(text), ['README.md', 'https://example.com']);
});

test('isLocalMarkdownLink filters out anchors and external URLs', () => {
  assert.equal(isLocalMarkdownLink('README.md'), true);
  assert.equal(isLocalMarkdownLink('#section'), false);
  assert.equal(isLocalMarkdownLink('https://example.com'), false);
});

test('verifyRepo passes for the checked-in docs surface', () => {
  const result = verifyRepo(repoRoot);
  assert.equal(result.ok, true, result.errors.join('\n'));
  for (const requiredFile of REQUIRED_FILES) {
    assert.ok(result.markdownFiles.includes(requiredFile) || requiredFile === 'LICENSE');
  }
});

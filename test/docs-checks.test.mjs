import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractMarkdownLinks,
  isLocalMarkdownLink,
  listMarkdownFiles,
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

test('listMarkdownFiles includes nested docs and skips hidden control directories', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'holyclaw-docs-'));

  try {
    fs.writeFileSync(path.join(fixtureRoot, 'README.md'), '# root\n');
    fs.mkdirSync(path.join(fixtureRoot, 'bible'), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, 'bible', 'entry.md'), '# nested\n');
    fs.mkdirSync(path.join(fixtureRoot, '.tokenburner'), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, '.tokenburner', 'repo-summary.md'), '# control\n');

    const markdownFiles = listMarkdownFiles(fixtureRoot);

    assert.deepEqual(markdownFiles, ['README.md', path.join('bible', 'entry.md')]);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('verifyRepo passes for the checked-in docs surface', () => {
  const result = verifyRepo(repoRoot);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.ok(result.markdownFiles.includes(path.join('bible', 'README.md')));
  for (const requiredFile of REQUIRED_FILES) {
    assert.ok(result.markdownFiles.includes(requiredFile) || requiredFile === 'LICENSE');
  }
});

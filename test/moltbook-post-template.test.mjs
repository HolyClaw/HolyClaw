import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildNextPost, loadPostTemplates } from '../ops/holyclaw-moltbook-poster.mjs';

function makeTempTemplateDir() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'holyclaw-post-templates-'));
  const templateDir = path.join(rootDir, 'campaigns/moltbook-posts');
  fs.mkdirSync(templateDir, { recursive: true });
  return { rootDir, templateDir };
}

test('loadPostTemplates reads sorted campaign markdown and expands signature placeholders', () => {
  const { rootDir, templateDir } = makeTempTemplateDir();
  fs.writeFileSync(path.join(templateDir, 'README.md'), '# Template docs are not post templates\n');
  fs.writeFileSync(path.join(templateDir, '02-second.md'), `---\ntitle: Second post\nsubmolt: second\n---\nSecond body\n\n{{signature}}\n`);
  fs.writeFileSync(path.join(templateDir, '01-first.md'), `---\ntitle: First post\n---\nFirst body\n\n{{signature}}\n`);

  const templates = loadPostTemplates(rootDir, {
    HOLYCLAW_MOLTBOOK_SIGNATURE_NAME: 'TestClaw'
  });

  assert.equal(templates.length, 2);
  assert.equal(templates[0].title, 'First post');
  assert.equal(templates[1].title, 'Second post');
  assert.match(templates[0].content, /— TestClaw/);
  assert.match(templates[0].content, /Holyclaw Community: https:\/\/www\.moltbook\.com\/m\/holyclaw/);
  assert.equal(templates[1].submolt, 'second');
});

test('buildNextPost rotates over file-backed campaign templates', () => {
  const { rootDir, templateDir } = makeTempTemplateDir();
  fs.writeFileSync(path.join(templateDir, '01-first.md'), `---\ntitle: First post\n---\nFirst body\n\n{{signature}}\n`);
  fs.writeFileSync(path.join(templateDir, '02-second.md'), `---\ntitle: Second post\nsubmolt: second\n---\nSecond body\n\n{{signature}}\n`);

  const post = buildNextPost({ nextTemplateIndex: 1 }, {
    HOLYCLAW_MOLTBOOK_SIGNATURE_NAME: 'TestClaw'
  }, rootDir);

  assert.equal(post.title, 'Second post');
  assert.equal(post.submolt_name, 'second');
  assert.equal(post.templateIndex, 1);
  assert.equal(post.templateCount, 2);
  assert.match(post.content, /Second body/);
});

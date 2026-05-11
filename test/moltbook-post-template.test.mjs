import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildNextPost, loadPostTemplates, parsePostTemplate } from '../ops/holyclaw-moltbook-poster.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const submoltNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

test('checked-in Moltbook campaign templates satisfy the no-network posting schema', () => {
  const templateDir = path.join(repoRoot, 'campaigns/moltbook-posts');
  const templateFiles = fs.readdirSync(templateDir)
    .filter((name) => /^[0-9]+-.+\.md$/.test(name))
    .sort();

  const templates = loadPostTemplates(repoRoot, {});

  assert.ok(templateFiles.length >= 3, 'expected checked-in Moltbook campaign templates');
  assert.equal(templates.length, templateFiles.length);

  for (const [index, fileName] of templateFiles.entries()) {
    const sourcePath = path.join(templateDir, fileName);
    const raw = fs.readFileSync(sourcePath, 'utf8');
    const template = templates[index];

    assert.equal(template.sourcePath, sourcePath);
    assert.match(raw, /^---\r?\n[\s\S]*?\r?\n---\r?\n[\s\S]+$/);
    assert.ok(template.title.trim(), `${fileName}: title must be non-empty`);
    assert.ok(template.content.trim(), `${fileName}: body must be non-empty`);
    assert.match(raw, /\{\{signature\}\}/, `${fileName}: must include signature placeholder`);
    assert.doesNotMatch(template.content, /\{\{signature\}\}/, `${fileName}: placeholder should be expanded`);
    assert.match(template.content, /— HolyClaw/, `${fileName}: default signature name should be applied`);
    assert.match(template.content, /Holyclaw Community: https:\/\/www\.moltbook\.com\/m\/holyclaw/, `${fileName}: default signature link should be applied`);
    if (template.submolt) {
      assert.match(template.submolt, submoltNamePattern, `${fileName}: submolt shape`);
    }
  }
});

test('parsePostTemplate rejects malformed optional submolt values', () => {
  const { rootDir } = makeTempTemplateDir();
  const filePath = path.join(rootDir, 'invalid-submolt.md');
  fs.writeFileSync(filePath, `---\ntitle: Bad target\nsubmolt: Not HolyClaw\n---\nBody\n\n{{signature}}\n`);

  assert.throws(
    () => parsePostTemplate(filePath, {}),
    /submolt must use lowercase letters, numbers, and dashes/
  );
});

test('parsePostTemplate requires a signature placeholder before expansion', () => {
  const { rootDir } = makeTempTemplateDir();
  const filePath = path.join(rootDir, 'missing-signature.md');
  fs.writeFileSync(filePath, `---\ntitle: Missing signature\nsubmolt: holyclaw\n---\nUnsigned body\n`);

  assert.throws(
    () => parsePostTemplate(filePath, {}),
    /signature placeholder is required/
  );
});

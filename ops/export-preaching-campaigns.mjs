#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_TEMPLATE_DIR = 'campaigns/moltbook-posts';

function parseFrontmatter(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${filePath}: missing frontmatter`);
  const metadata = {};
  for (const [index, rawLine] of match[1].split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const parsed = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!parsed) throw new Error(`${filePath}: invalid frontmatter line ${index + 1}`);
    metadata[parsed[1]] = parsed[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return { metadata, body: match[2].trim() };
}

function slugFromFile(filePath) {
  return path.basename(filePath, '.md').replace(/^[0-9]+-/, '');
}

function loadCampaigns(rootDir = process.cwd()) {
  const templateDir = path.join(rootDir, DEFAULT_TEMPLATE_DIR);
  const files = fs.readdirSync(templateDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^[0-9]+-.+\.md$/.test(entry.name))
    .map((entry) => path.join(templateDir, entry.name))
    .sort((left, right) => left.localeCompare(right));

  return files.map((filePath) => {
    const { metadata, body } = parseFrontmatter(filePath);
    if (!metadata.title) throw new Error(`${filePath}: title is required`);
    if (!body) throw new Error(`${filePath}: body is required`);
    return {
      id: slugFromFile(filePath),
      title: metadata.title,
      platform: 'moltbook',
      target: metadata.submolt || 'holyclaw',
      body,
      sourcePath: path.relative(rootDir, filePath),
      status: 'active'
    };
  });
}

function buildCampaignPack(rootDir = process.cwd(), now = new Date()) {
  return {
    schemaVersion: '1.0.0',
    sourceModule: 'holyclaw',
    generatedAt: now.toISOString(),
    campaigns: loadCampaigns(rootDir)
  };
}

function runCli() {
  const pack = buildCampaignPack(process.cwd());
  console.log(JSON.stringify(pack, null, 2));
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) runCli();

export { buildCampaignPack, loadCampaigns, parseFrontmatter };

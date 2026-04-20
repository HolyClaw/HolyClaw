import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REQUIRED_FILES = [
  'AGENTS.md',
  'README.md',
  'AI-AGENTS.md',
  'HUMAN.md',
  'HUMAN_ORIGINAL.md',
  'LICENSE'
];

export function extractMarkdownLinks(text) {
  const matches = text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
  return [...matches].map((match) => match[1]);
}

export function isLocalMarkdownLink(link) {
  if (!link || link.startsWith('#')) return false;
  return !/^[a-z]+:/i.test(link);
}

export function listMarkdownFiles(rootDir) {
  return fs.readdirSync(rootDir)
    .filter((entry) => entry.endsWith('.md'))
    .sort();
}

export function verifyRepo(rootDir) {
  const errors = [];
  const markdownFiles = listMarkdownFiles(rootDir);

  for (const requiredFile of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(rootDir, requiredFile))) {
      errors.push(`Missing required file: ${requiredFile}`);
    }
  }

  for (const file of markdownFiles) {
    const absolutePath = path.join(rootDir, file);
    const contents = fs.readFileSync(absolutePath, 'utf8');
    const links = extractMarkdownLinks(contents).filter(isLocalMarkdownLink);

    for (const link of links) {
      const target = link.split('#')[0];
      if (!target) continue;
      const resolved = path.resolve(path.dirname(absolutePath), target);
      if (!fs.existsSync(resolved)) {
        errors.push(`${file}: broken local link -> ${link}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    markdownFiles
  };
}

function runCli() {
  const rootDir = process.cwd();
  const result = verifyRepo(rootDir);
  if (!result.ok) {
    console.error('HolyClaw docs verification failed.');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`HolyClaw docs verification passed for ${result.markdownFiles.length} markdown files.`);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  runCli();
}

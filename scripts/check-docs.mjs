import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const REQUIRED_FILES = [
  'AGENTS.md',
  'CONTRIBUTING.md',
  'README.md',
  'AI-AGENTS.md',
  'HUMAN.md',
  'HUMAN_ORIGINAL.md',
  'LICENSE'
];

export const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.tokenburner',
  'node_modules'
]);

export const REQUIRED_REWARD_FILES = [
  'rewards/README.md',
  'rewards/tasks.json',
  'rewards/ledger.json',
  'rewards/openclaw-mcp.example.json',
  'rewards/claims/TEMPLATE.md'
];

export function extractMarkdownLinks(text) {
  const matches = text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
  return [...matches].map((match) => match[1]);
}

export function extractHtmlHrefLinks(text) {
  const matches = text.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi);
  return [...matches].map((match) => match[1] ?? match[2] ?? match[3]);
}

export function isLocalMarkdownLink(link) {
  if (!link || link.startsWith('#')) return false;
  return !/^[a-z]+:/i.test(link);
}

export function listMarkdownFiles(rootDir) {
  return walkMarkdownFiles(rootDir).sort();
}

function walkMarkdownFiles(rootDir, relativeDir = '') {
  const directory = path.join(rootDir, relativeDir);
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  const markdownFiles = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIPPED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      markdownFiles.push(...walkMarkdownFiles(rootDir, relativePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      markdownFiles.push(relativePath);
    }
  }

  return markdownFiles;
}


export function readJsonFile(rootDir, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`${relativePath}: invalid JSON (${error.message})`);
  }
}

export function verifyRewardsSurface(rootDir) {
  const errors = [];
  const tasksPath = 'rewards/tasks.json';
  const ledgerPath = 'rewards/ledger.json';
  const mcpExamplePath = 'rewards/openclaw-mcp.example.json';

  if (!fs.existsSync(path.join(rootDir, tasksPath))
    || !fs.existsSync(path.join(rootDir, ledgerPath))
    || !fs.existsSync(path.join(rootDir, mcpExamplePath))) {
    return errors;
  }

  let tasksConfig;
  let ledger;
  let mcpExample;
  try {
    tasksConfig = readJsonFile(rootDir, tasksPath);
    ledger = readJsonFile(rootDir, ledgerPath);
    mcpExample = readJsonFile(rootDir, mcpExamplePath);
  } catch (error) {
    errors.push(error.message);
    return errors;
  }

  if (tasksConfig.version !== 1) {
    errors.push(`${tasksPath}: version must be 1`);
  }
  if (tasksConfig.sourceOfTruth !== 'github-ledger') {
    errors.push(`${tasksPath}: sourceOfTruth must be github-ledger`);
  }
  if (tasksConfig.rewardUnit !== 'reputation') {
    errors.push(`${tasksPath}: rewardUnit must be reputation`);
  }
  if (!Array.isArray(tasksConfig.tasks) || tasksConfig.tasks.length === 0) {
    errors.push(`${tasksPath}: tasks must be a non-empty array`);
  } else {
    const seenTaskIds = new Set();
    for (const [index, task] of tasksConfig.tasks.entries()) {
      const label = `${tasksPath}: tasks[${index}]`;
      if (!task.id || typeof task.id !== 'string') {
        errors.push(`${label}.id must be a non-empty string`);
      } else if (seenTaskIds.has(task.id)) {
        errors.push(`${label}.id duplicates ${task.id}`);
      } else {
        seenTaskIds.add(task.id);
      }
      if (!task.title || typeof task.title !== 'string') {
        errors.push(`${label}.title must be a non-empty string`);
      }
      if (!['open', 'locked', 'retired'].includes(task.status)) {
        errors.push(`${label}.status must be open, locked, or retired`);
      }
      if (!Number.isInteger(task.minimumReputation) || task.minimumReputation < 0) {
        errors.push(`${label}.minimumReputation must be a non-negative integer`);
      }
      if (!Number.isInteger(task.reward?.reputationPoints) || task.reward.reputationPoints <= 0) {
        errors.push(`${label}.reward.reputationPoints must be a positive integer`);
      }
      if (!task.proof || typeof task.proof.type !== 'string') {
        errors.push(`${label}.proof.type must be a string`);
      }
      if (!Array.isArray(task.proof?.requiredFields) || task.proof.requiredFields.length === 0) {
        errors.push(`${label}.proof.requiredFields must be a non-empty array`);
      }
      if (!Array.isArray(task.unlocks)) {
        errors.push(`${label}.unlocks must be an array`);
      }
    }
  }

  if (ledger.version !== 1) {
    errors.push(`${ledgerPath}: version must be 1`);
  }
  if (ledger.rewardUnit !== 'reputation') {
    errors.push(`${ledgerPath}: rewardUnit must be reputation`);
  }
  if (!Array.isArray(ledger.entries)) {
    errors.push(`${ledgerPath}: entries must be an array`);
  } else {
    const taskIds = new Set((tasksConfig.tasks ?? []).map((task) => task.id));
    for (const [index, entry] of ledger.entries.entries()) {
      const label = `${ledgerPath}: entries[${index}]`;
      if (!entry.id || typeof entry.id !== 'string') {
        errors.push(`${label}.id must be a non-empty string`);
      }
      if (!entry.identity || typeof entry.identity !== 'string') {
        errors.push(`${label}.identity must be a non-empty string`);
      }
      if (!taskIds.has(entry.taskId)) {
        errors.push(`${label}.taskId must reference a task in ${tasksPath}`);
      }
      if (!Number.isInteger(entry.reputationPoints) || entry.reputationPoints <= 0) {
        errors.push(`${label}.reputationPoints must be a positive integer`);
      }
      if (!entry.proofUrl || typeof entry.proofUrl !== 'string') {
        errors.push(`${label}.proofUrl must be a non-empty string`);
      }
    }
  }

  const rewardsServer = mcpExample.mcpServers?.['holyclaw-rewards'];
  if (!rewardsServer) {
    errors.push(`${mcpExamplePath}: mcpServers.holyclaw-rewards is required`);
  } else {
    if (rewardsServer.command !== 'node') {
      errors.push(`${mcpExamplePath}: holyclaw-rewards.command must be node`);
    }
    if (!Array.isArray(rewardsServer.args) || !rewardsServer.args.some((arg) => arg.endsWith('scripts/holyclaw-rewards-mcp.mjs'))) {
      errors.push(`${mcpExamplePath}: holyclaw-rewards.args must include a path ending in scripts/holyclaw-rewards-mcp.mjs`);
    }
    if (rewardsServer.env?.REWARD_MODE !== 'reputation') {
      errors.push(`${mcpExamplePath}: holyclaw-rewards.env.REWARD_MODE must be reputation`);
    }
  }

  return errors;
}

export function verifyRepo(rootDir) {
  const errors = [];
  const markdownFiles = listMarkdownFiles(rootDir);

  for (const requiredFile of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(rootDir, requiredFile))) {
      errors.push(`Missing required file: ${requiredFile}`);
    }
  }

  for (const requiredFile of REQUIRED_REWARD_FILES) {
    if (!fs.existsSync(path.join(rootDir, requiredFile))) {
      errors.push(`Missing required rewards file: ${requiredFile}`);
    }
  }

  errors.push(...verifyRewardsSurface(rootDir));

  for (const file of markdownFiles) {
    const absolutePath = path.join(rootDir, file);
    const contents = fs.readFileSync(absolutePath, 'utf8');
    const links = [
      ...extractMarkdownLinks(contents),
      ...extractHtmlHrefLinks(contents)
    ].filter(isLocalMarkdownLink);

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

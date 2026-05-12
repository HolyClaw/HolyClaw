import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractHtmlHrefLinks,
  extractMarkdownLinks,
  isLocalMarkdownLink,
  listMarkdownFiles,
  verifyRepo,
  verifyRewardsSurface,
  REQUIRED_FILES,
  REQUIRED_OPERATION_FILES,
  REQUIRED_REWARD_FILES
} from '../scripts/check-docs.mjs';

import {
  callRewardsTool,
  handleJsonRpcMessage
} from '../scripts/holyclaw-rewards-mcp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function writeRequiredDocs(rootDir, readmeContents = '# placeholder\n') {
  for (const requiredFile of REQUIRED_FILES) {
    fs.mkdirSync(path.dirname(path.join(rootDir, requiredFile)), { recursive: true });
    fs.writeFileSync(path.join(rootDir, requiredFile), requiredFile === 'README.md'
      ? readmeContents
      : '# placeholder\n');
  }
}

function writeValidRewardsSurface(rootDir) {
  fs.mkdirSync(path.join(rootDir, 'rewards'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'rewards', 'README.md'), '# Rewards\n\n[Tasks](tasks.json)\n');
  fs.writeFileSync(path.join(rootDir, 'rewards', 'tasks.json'), `${JSON.stringify({
    version: 1,
    sourceOfTruth: 'github-ledger',
    rewardUnit: 'reputation',
    tasks: [
      {
        id: 'fixture-task',
        title: 'Fixture task',
        status: 'open',
        minimumReputation: 0,
        reward: { reputationPoints: 1 },
        proof: { type: 'merged_pull_request', requiredFields: ['prUrl'] },
        unlocks: []
      }
    ]
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(rootDir, 'rewards', 'ledger.json'), `${JSON.stringify({
    version: 1,
    rewardUnit: 'reputation',
    entries: []
  }, null, 2)}\n`);
  fs.mkdirSync(path.join(rootDir, 'rewards', 'claims'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'rewards', 'claims', 'TEMPLATE.md'), '# Claim Template\n');
  fs.writeFileSync(path.join(rootDir, 'rewards', 'openclaw-mcp.example.json'), `${JSON.stringify({
    mcpServers: {
      'holyclaw-rewards': {
        command: 'node',
        args: ['scripts/holyclaw-rewards-mcp.mjs'],
        env: { REWARD_MODE: 'reputation' }
      }
    }
  }, null, 2)}\n`);
}

function writeRequiredOperationDocs(rootDir) {
  for (const requiredFile of REQUIRED_OPERATION_FILES) {
    fs.mkdirSync(path.dirname(path.join(rootDir, requiredFile)), { recursive: true });
    fs.writeFileSync(path.join(rootDir, requiredFile), '# placeholder\n');
  }
}

test('extractMarkdownLinks returns markdown link targets', () => {
  const text = '[doc](README.md) and [community](https://example.com)';
  assert.deepEqual(extractMarkdownLinks(text), ['README.md', 'https://example.com']);
});

test('extractHtmlHrefLinks returns inline HTML href targets', () => {
  const text = '<a href="README.md">Gateway</a> <a href=\'AI-AGENTS.md#covenant\'>Agents</a> <a href=https://example.com>Community</a>';
  assert.deepEqual(extractHtmlHrefLinks(text), ['README.md', 'AI-AGENTS.md#covenant', 'https://example.com']);
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
  assert.ok(result.markdownFiles.includes(path.join('rewards', 'README.md')));
  for (const requiredFile of REQUIRED_OPERATION_FILES) {
    assert.ok(result.markdownFiles.includes(requiredFile));
  }
  for (const requiredFile of REQUIRED_FILES) {
    assert.ok(fs.existsSync(path.join(repoRoot, requiredFile)));
    if (requiredFile.endsWith('.md')) {
      assert.ok(result.markdownFiles.includes(requiredFile));
    }
  }
});

test('verifyRepo rejects broken local HTML href targets and keeps nested markdown coverage', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'holyclaw-html-href-'));

  try {
    writeRequiredDocs(fixtureRoot, '<a href="missing.md">Broken gateway link</a>\n');
    writeValidRewardsSurface(fixtureRoot);
    writeRequiredOperationDocs(fixtureRoot);

    fs.mkdirSync(path.join(fixtureRoot, 'bible'), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, 'bible', 'entry.md'), '# nested\n');

    const result = verifyRepo(fixtureRoot);

    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('README.md: broken local link -> missing.md'));
    assert.ok(result.markdownFiles.includes(path.join('bible', 'entry.md')));
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});


test('verifyRepo requires the rewards protocol surface', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'holyclaw-rewards-required-'));

  try {
    writeRequiredDocs(fixtureRoot);
    writeRequiredOperationDocs(fixtureRoot);

    const result = verifyRepo(fixtureRoot);

    assert.equal(result.ok, false);
    for (const requiredFile of REQUIRED_REWARD_FILES) {
      assert.ok(result.errors.includes(`Missing required rewards file: ${requiredFile}`));
    }
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('verifyRepo requires the publisher and campaign operations docs', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'holyclaw-ops-docs-required-'));

  try {
    writeRequiredDocs(fixtureRoot);
    writeValidRewardsSurface(fixtureRoot);

    const result = verifyRepo(fixtureRoot);

    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('Missing required operations file: docs/holyclaw-moltbook-autoposting.md'));
    assert.ok(result.errors.includes('Missing required operations file: docs/holyclaw-publisher-ops.md'));
    assert.ok(result.errors.includes('Missing required operations file: campaigns/moltbook-posts/README.md'));
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('verifyRewardsSurface rejects invalid task reward shape', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'holyclaw-rewards-invalid-'));

  try {
    writeValidRewardsSurface(fixtureRoot);
    const tasksPath = path.join(fixtureRoot, 'rewards', 'tasks.json');
    const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
    tasks.tasks[0].reward.reputationPoints = 0;
    fs.writeFileSync(tasksPath, `${JSON.stringify(tasks, null, 2)}\n`);

    const errors = verifyRewardsSurface(fixtureRoot);

    assert.ok(errors.includes('rewards/tasks.json: tasks[0].reward.reputationPoints must be a positive integer'));
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('verifyRewardsSurface rejects ledger entries that reference unknown tasks', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'holyclaw-ledger-invalid-'));

  try {
    writeValidRewardsSurface(fixtureRoot);
    fs.writeFileSync(path.join(fixtureRoot, 'rewards', 'ledger.json'), `${JSON.stringify({
      version: 1,
      rewardUnit: 'reputation',
      entries: [
        {
          id: 'entry-1',
          identity: 'github:alice',
          taskId: 'missing-task',
          reputationPoints: 1,
          proofUrl: 'https://github.com/HolyClaw/HolyClaw/pull/1'
        }
      ]
    }, null, 2)}\n`);

    const errors = verifyRewardsSurface(fixtureRoot);

    assert.ok(errors.includes('rewards/ledger.json: entries[0].taskId must reference a task in rewards/tasks.json'));
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});


function fixtureRewardsState() {
  return {
    tasksConfig: {
      version: 1,
      sourceOfTruth: 'github-ledger',
      rewardUnit: 'reputation',
      tasks: [
        {
          id: 'fixture-task',
          title: 'Fixture task',
          status: 'open',
          minimumReputation: 5,
          reward: { reputationPoints: 10 },
          proof: { type: 'merged_pull_request', requiredFields: ['prUrl', 'mergedAt', 'reviewer'] },
          unlocks: []
        }
      ]
    },
    ledger: {
      version: 1,
      rewardUnit: 'reputation',
      entries: [
        {
          id: 'entry-1',
          identity: 'github:alice',
          taskId: 'fixture-task',
          reputationPoints: 5,
          proofUrl: 'https://github.com/HolyClaw/HolyClaw/pull/1'
        }
      ]
    }
  };
}

test('MCP rewards tool lists task access by reputation', () => {
  const result = callRewardsTool('holyclaw_list_tasks', { identity: 'github:alice' }, { state: fixtureRewardsState() });

  assert.equal(result.isError, false);
  assert.equal(result.structuredContent.reputation, 5);
  assert.equal(result.structuredContent.tasks[0].accessible, true);
});

test('MCP rewards tool drafts PR proof ledger entries without writing by default', () => {
  const result = callRewardsTool('holyclaw_submit_pr_proof', {
    identity: 'github:bob',
    taskId: 'fixture-task',
    prUrl: 'https://github.com/HolyClaw/HolyClaw/pull/2',
    mergedAt: '2026-04-30T00:00:00Z',
    reviewer: 'github:maintainer'
  }, { state: fixtureRewardsState() });

  assert.equal(result.structuredContent.written, false);
  assert.equal(result.structuredContent.entry.identity, 'github:bob');
  assert.equal(result.structuredContent.entry.reputationPoints, 10);
  assert.equal(result.structuredContent.entry.proof.prUrl, 'https://github.com/HolyClaw/HolyClaw/pull/2');
});

test('MCP JSON-RPC handler exposes deterministic tool discovery', () => {
  const response = handleJsonRpcMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

  assert.equal(response.jsonrpc, '2.0');
  assert.equal(response.id, 1);
  assert.ok(response.result.tools.some((tool) => tool.name === 'holyclaw_check_reputation'));
});

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROTOCOL_VERSION = '2025-11-25';
const SERVER_INFO = {
  name: 'holyclaw-rewards-mcp',
  version: '0.1.0'
};

const TOOL_DEFINITIONS = [
  {
    name: 'holyclaw_list_tasks',
    title: 'List Holyclaw reward tasks',
    description: 'List GitHub-native Holyclaw reputation tasks and show whether an identity can access them.',
    inputSchema: {
      type: 'object',
      properties: {
        identity: {
          type: 'string',
          description: 'Optional contributor identity, such as github:alice.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'holyclaw_check_reputation',
    title: 'Check Holyclaw reputation',
    description: 'Return reputation totals and ledger entries for a contributor identity.',
    inputSchema: {
      type: 'object',
      required: ['identity'],
      properties: {
        identity: {
          type: 'string',
          description: 'Contributor identity, such as github:alice.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'holyclaw_explain_task_access',
    title: 'Explain Holyclaw task access',
    description: 'Explain whether a contributor can claim a task and what reputation is required.',
    inputSchema: {
      type: 'object',
      required: ['identity', 'taskId'],
      properties: {
        identity: {
          type: 'string',
          description: 'Contributor identity, such as github:alice.'
        },
        taskId: {
          type: 'string',
          description: 'Task ID from rewards/tasks.json.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'holyclaw_submit_pr_proof',
    title: 'Draft or append a PR proof reward entry',
    description: 'Validate proof fields for a task and return a ledger entry draft. Writes only when write=true and HOLYCLAW_ALLOW_LEDGER_WRITE=true.',
    inputSchema: {
      type: 'object',
      required: ['identity', 'taskId'],
      properties: {
        identity: {
          type: 'string',
          description: 'Contributor identity, such as github:alice.'
        },
        taskId: {
          type: 'string',
          description: 'Task ID from rewards/tasks.json.'
        },
        prUrl: {
          type: 'string',
          description: 'Merged pull request URL.'
        },
        proofUrl: {
          type: 'string',
          description: 'Generic proof URL when the task uses a non-PR proof field.'
        },
        mergedAt: {
          type: 'string',
          description: 'Merge timestamp for accepted work.'
        },
        reviewer: {
          type: 'string',
          description: 'Reviewer or maintainer identity.'
        },
        sourceUrl: {
          type: 'string',
          description: 'Distribution source URL for referral tasks.'
        },
        downstreamPrUrl: {
          type: 'string',
          description: 'Accepted downstream pull request URL for referral tasks.'
        },
        governanceReference: {
          type: 'string',
          description: 'Governance proposal/discussion URL for canon changes.'
        },
        write: {
          type: 'boolean',
          description: 'Append to rewards/ledger.json only when the server env also allows writes.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'holyclaw_get_reward_ledger',
    title: 'Get Holyclaw reward ledger',
    description: 'Return ledger entries, optionally filtered by identity.',
    inputSchema: {
      type: 'object',
      properties: {
        identity: {
          type: 'string',
          description: 'Optional contributor identity filter.'
        }
      },
      additionalProperties: false
    }
  }
];

export function resolveRewardsRoot(env = process.env, cwd = process.cwd()) {
  const repoRoot = path.resolve(env.HOLYCLAW_REPO_ROOT ?? cwd);
  return path.resolve(repoRoot, env.HOLYCLAW_REWARDS_PATH ?? 'rewards');
}

export function loadRewardsState(rewardsRoot = resolveRewardsRoot()) {
  const tasksPath = path.join(rewardsRoot, 'tasks.json');
  const ledgerPath = path.join(rewardsRoot, 'ledger.json');
  const tasksConfig = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  return { rewardsRoot, tasksPath, ledgerPath, tasksConfig, ledger };
}

export function calculateReputation(ledger, identity) {
  const entries = (ledger.entries ?? []).filter((entry) => entry.identity === identity);
  const reputation = entries.reduce((sum, entry) => sum + (entry.reputationPoints ?? 0), 0);
  return { identity, reputation, entries };
}

export function getTask(tasksConfig, taskId) {
  return (tasksConfig.tasks ?? []).find((task) => task.id === taskId);
}

export function canAccessTask(task, reputation) {
  return task.status === 'open' && reputation >= task.minimumReputation;
}

function requireString(value, fieldName) {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

function normalizeProofArguments(args) {
  return {
    ...args,
    proofUrl: args.proofUrl ?? args.prUrl ?? args.downstreamPrUrl
  };
}

export function buildLedgerEntry(state, args) {
  const identity = requireString(args.identity, 'identity');
  const taskId = requireString(args.taskId, 'taskId');
  const task = getTask(state.tasksConfig, taskId);
  if (!task) {
    throw new Error(`Unknown taskId: ${taskId}`);
  }

  const normalizedArgs = normalizeProofArguments(args);
  const missingFields = task.proof.requiredFields.filter((field) => !normalizedArgs[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing proof field(s) for ${taskId}: ${missingFields.join(', ')}`);
  }

  const proofUrl = normalizedArgs.proofUrl ?? normalizedArgs.prUrl ?? normalizedArgs.downstreamPrUrl;
  const entryIdSeed = `${taskId}:${identity}:${proofUrl}`;
  const id = entryIdSeed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);

  return {
    id,
    identity,
    taskId,
    reputationPoints: task.reward.reputationPoints,
    proofUrl,
    proof: Object.fromEntries(task.proof.requiredFields.map((field) => [field, normalizedArgs[field]])),
    recordedAt: new Date().toISOString()
  };
}

export function appendLedgerEntry(state, entry) {
  const ledger = {
    ...state.ledger,
    entries: [...(state.ledger.entries ?? []), entry]
  };
  fs.writeFileSync(state.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}

function textResult(payload, isError = false) {
  const text = JSON.stringify(payload, null, 2);
  return {
    content: [{ type: 'text', text }],
    structuredContent: payload,
    isError
  };
}

export function listTools() {
  return TOOL_DEFINITIONS;
}

export function callRewardsTool(name, args = {}, options = {}) {
  const state = options.state ?? loadRewardsState(options.rewardsRoot);

  if (name === 'holyclaw_list_tasks') {
    const reputation = args.identity ? calculateReputation(state.ledger, args.identity).reputation : 0;
    return textResult({
      identity: args.identity ?? null,
      reputation,
      tasks: state.tasksConfig.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        minimumReputation: task.minimumReputation,
        reputationPoints: task.reward.reputationPoints,
        accessible: canAccessTask(task, reputation),
        proofType: task.proof.type
      }))
    });
  }

  if (name === 'holyclaw_check_reputation') {
    const identity = requireString(args.identity, 'identity');
    return textResult(calculateReputation(state.ledger, identity));
  }

  if (name === 'holyclaw_explain_task_access') {
    const identity = requireString(args.identity, 'identity');
    const taskId = requireString(args.taskId, 'taskId');
    const task = getTask(state.tasksConfig, taskId);
    if (!task) {
      throw new Error(`Unknown taskId: ${taskId}`);
    }
    const { reputation } = calculateReputation(state.ledger, identity);
    const accessible = canAccessTask(task, reputation);
    return textResult({
      identity,
      taskId,
      status: task.status,
      reputation,
      minimumReputation: task.minimumReputation,
      accessible,
      reason: accessible
        ? 'Task is open and contributor meets the reputation requirement.'
        : `Task requires status=open and at least ${task.minimumReputation} reputation.`
    });
  }

  if (name === 'holyclaw_submit_pr_proof') {
    const entry = buildLedgerEntry(state, args);
    const writeRequested = args.write === true;
    const writeAllowed = process.env.HOLYCLAW_ALLOW_LEDGER_WRITE === 'true';
    if (writeRequested && writeAllowed) {
      const ledger = appendLedgerEntry(state, entry);
      return textResult({ written: true, entry, totalEntries: ledger.entries.length });
    }
    return textResult({
      written: false,
      reason: writeRequested
        ? 'Set HOLYCLAW_ALLOW_LEDGER_WRITE=true to allow MCP ledger writes.'
        : 'Dry run: submit this entry through a GitHub pull request to update rewards/ledger.json.',
      entry
    });
  }

  if (name === 'holyclaw_get_reward_ledger') {
    const entries = args.identity
      ? (state.ledger.entries ?? []).filter((entry) => entry.identity === args.identity)
      : (state.ledger.entries ?? []);
    return textResult({ identity: args.identity ?? null, rewardUnit: state.ledger.rewardUnit, entries });
  }

  throw new Error(`Unknown tool: ${name}`);
}

function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

export function handleJsonRpcMessage(message) {
  if (message.method === 'notifications/initialized') {
    return null;
  }

  try {
    if (message.method === 'initialize') {
      return jsonRpcResponse(message.id, {
        protocolVersion: message.params?.protocolVersion ?? PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO
      });
    }

    if (message.method === 'tools/list') {
      return jsonRpcResponse(message.id, { tools: listTools() });
    }

    if (message.method === 'tools/call') {
      const { name, arguments: args = {} } = message.params ?? {};
      return jsonRpcResponse(message.id, callRewardsTool(name, args));
    }

    return jsonRpcError(message.id, -32601, `Method not found: ${message.method}`);
  } catch (error) {
    return jsonRpcError(message.id, -32000, error.message);
  }
}

export function runStdioServer(input = process.stdin, output = process.stdout) {
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      output.write(`${JSON.stringify(jsonRpcError(null, -32700, `Parse error: ${error.message}`))}\n`);
      return;
    }
    const response = handleJsonRpcMessage(message);
    if (response) {
      output.write(`${JSON.stringify(response)}\n`);
    }
  });
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  runStdioServer();
}

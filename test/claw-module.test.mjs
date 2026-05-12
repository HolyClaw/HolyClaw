import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCampaignPack } from '../ops/export-preaching-campaigns.mjs';
import { validateClawModule } from '../ops/validate-claw-module.mjs';

test('HolyClaw claw.module.json is valid and references existing local entrypoints', () => {
  const result = validateClawModule('claw.module.json');
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.manifest.module.name, 'holyclaw');
  assert.ok(result.manifest.provides.some((capability) => capability.id === 'preaching.campaigns'));
});

test('export-preaching-campaigns emits a campaign pack from file-backed templates', () => {
  const pack = buildCampaignPack(process.cwd(), new Date('2026-05-12T00:00:00Z'));
  assert.equal(pack.schemaVersion, '1.0.0');
  assert.equal(pack.sourceModule, 'holyclaw');
  assert.equal(pack.generatedAt, '2026-05-12T00:00:00.000Z');
  assert.ok(pack.campaigns.length >= 3);
  assert.deepEqual(pack.campaigns.map((campaign) => campaign.platform), Array(pack.campaigns.length).fill('moltbook'));
  assert.ok(pack.campaigns.every((campaign) => campaign.target === 'holyclaw'));
  assert.ok(pack.campaigns.every((campaign) => campaign.sourcePath.startsWith('campaigns/moltbook-posts/')));
});

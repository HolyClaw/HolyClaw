#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isExternalReference(value) {
  return /^[a-z]+:/i.test(value) || value.includes('#');
}

function assertPathExists(baseDir, value, label, errors) {
  if (!value || isExternalReference(value)) return;
  const resolved = path.resolve(baseDir, value);
  if (!fs.existsSync(resolved)) errors.push(`${label} missing: ${value}`);
}

function validateClawModule(manifestPath) {
  const absoluteManifestPath = path.resolve(manifestPath);
  const baseDir = path.dirname(absoluteManifestPath);
  const manifest = readJson(absoluteManifestPath);
  const errors = [];

  if (manifest.schemaVersion !== '1.0.0') errors.push('schemaVersion must be 1.0.0');
  if (!manifest.module?.name) errors.push('module.name is required');
  if (!Array.isArray(manifest.module?.types) || manifest.module.types.length === 0) {
    errors.push('module.types must be a non-empty array');
  }
  if (!Array.isArray(manifest.provides)) errors.push('provides must be an array');
  if (!Array.isArray(manifest.consumes)) errors.push('consumes must be an array');
  if (!manifest.entrypoints?.health) errors.push('entrypoints.health is required');
  if (!Array.isArray(manifest.runtimes) || manifest.runtimes.length === 0) {
    errors.push('runtimes must be a non-empty array');
  }

  assertPathExists(baseDir, manifest.$schema, '$schema', errors);
  for (const [name, entrypoint] of Object.entries(manifest.entrypoints ?? {})) {
    assertPathExists(baseDir, entrypoint, `entrypoints.${name}`, errors);
  }
  for (const [index, capability] of [...(manifest.provides ?? []), ...(manifest.consumes ?? [])].entries()) {
    if (!capability.id) errors.push(`capabilities[${index}].id is required`);
    if (!capability.version) errors.push(`capabilities[${index}].version is required`);
    if (!capability.kind) errors.push(`capabilities[${index}].kind is required`);
    assertPathExists(baseDir, capability.contract, `capabilities[${index}].contract`, errors);
    assertPathExists(baseDir, capability.entrypoint, `capabilities[${index}].entrypoint`, errors);
  }
  for (const [index, runtime] of (manifest.runtimes ?? []).entries()) {
    if (!runtime.id) errors.push(`runtimes[${index}].id is required`);
    if (!runtime.kind) errors.push(`runtimes[${index}].kind is required`);
    if (!runtime.status) errors.push(`runtimes[${index}].status is required`);
  }

  return { ok: errors.length === 0, errors, manifest };
}

function runCli() {
  const manifestPath = process.argv[2] || 'claw.module.json';
  const result = validateClawModule(manifestPath);
  if (!result.ok) {
    console.error(`Claw module validation failed for ${manifestPath}`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Claw module validation passed for ${manifestPath}`);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) runCli();

export { validateClawModule };

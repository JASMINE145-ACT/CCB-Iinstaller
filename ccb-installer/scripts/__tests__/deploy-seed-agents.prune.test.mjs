#!/usr/bin/env node
/** Smoke: deploy-seed-agents retired-agent prune (no live CCB dir mutation). */
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const installerRoot = join(here, '..', '..');
const script = join(here, '..', 'deploy-seed-agents.mjs');
const tmp = join(installerRoot, '.tmp-deploy-seed-prune-test');
const live = join(tmp, 'live-agents');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

rmSync(tmp, { recursive: true, force: true });
mkdirSync(live, { recursive: true });
writeFileSync(join(live, 'cowork.md'), '---\nname: cowork\n---\n', 'utf8');
writeFileSync(join(live, 'cowork.aionui.json'), '{}', 'utf8');
writeFileSync(join(live, 'quotation-agent.md'), 'stale', 'utf8');

const run = spawnSync(
  process.execPath,
  [script, '--force-md', `--config=${live}`],
  { encoding: 'utf8', cwd: installerRoot },
);

if (run.status !== 0) {
  console.error(run.stdout);
  console.error(run.stderr);
  process.exit(run.status ?? 1);
}

assert(!existsSync(join(live, 'cowork.md')), 'cowork.md should be pruned');
assert(!existsSync(join(live, 'cowork.aionui.json')), 'cowork sidecar should be pruned');
assert(!existsSync(join(live, 'word-form-creator.md')), 'word-form-creator.md should stay absent');
const q = readFileSync(join(live, 'quotation-agent.md'), 'utf8');
assert(q.startsWith('---'), 'quotation-agent.md should be redeployed from seed');

rmSync(tmp, { recursive: true, force: true });
console.log('PASS deploy-seed-agents prune smoke');

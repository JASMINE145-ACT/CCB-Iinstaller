import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const quotationHealthManifest = JSON.parse(
  readFileSync(
    join(repoRoot, 'ccb-installer', 'packages', 'vertical', 'com.wanding.trade', 'health', 'mcp-health-manifest.json'),
    'utf8'
  )
);
const warmScript = readFileSync(join(repoRoot, 'ccb-installer', 'lib', 'warm-wanding-mcp.mjs'), 'utf8');

test('quotation deep probe budget matches the shipped warm-script work budget', () => {
  const workBudgetMs = 120_000;

  assert.match(warmScript, /setTimeout\(\(\) => finish\(false, 'timeout 120s'\), 120_000\)/);
  assert.equal(quotationHealthManifest.mcp_servers.quotation.probe_timeout_ms, workBudgetMs);
});

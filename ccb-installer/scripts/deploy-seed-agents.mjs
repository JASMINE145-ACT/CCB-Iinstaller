#!/usr/bin/env node
/** Deploy seed agents; mirrors deploy-seed-agents.ps1 including -ForceMd.
 *  When source is install-root seed/agents (hot update / bootstrap), always overwrite .md. */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const installDir = join(scriptDir, '..');
const seedAgentsDir = join(installDir, 'seed', 'agents');
const configAgentsDir = join(installDir, 'config', 'agents');
const packageAgentsDir = join(
  installDir,
  'packages',
  'vertical',
  'com.wanding.trade',
  'agents',
);

const explicitSource = process.argv.find((a) => a.startsWith('--source='))?.slice('--source='.length);
let sourceDir = explicitSource ?? null;
let sourceDirs = [];
if (!sourceDir) {
  if (existsSync(join(seedAgentsDir, 'quotation-agent.md'))) {
    sourceDir = seedAgentsDir;
  } else if (existsSync(configAgentsDir)) {
    sourceDir = configAgentsDir;
  } else {
    throw new Error(`No agent seed source found (checked seed and config/agents under ${installDir})`);
  }
}
sourceDirs = explicitSource
  ? [sourceDir]
  : sourceDir === seedAgentsDir
    ? [seedAgentsDir]
    : [configAgentsDir, packageAgentsDir].filter(existsSync);
const configDir =
  process.argv.find((a) => a.startsWith('--config='))?.slice('--config='.length) ??
  join(process.env.LOCALAPPDATA ?? '', 'CCB-Wanding', '.claude', 'agents');
const forceMdFlag = process.argv.includes('--force-md');
const noPruneFlag = process.argv.includes('--no-prune');
const fromShippedSeed = sourceDir.replace(/\\/g, '/').toLowerCase().endsWith('seed/agents');
const forceMd = forceMdFlag || fromShippedSeed;

function loadRetiredAgentIds() {
  const candidates = [
    join(configAgentsDir, 'retired-agent-ids.json'),
    join(installDir, 'seed', 'agents', 'retired-agent-ids.json'),
    join(sourceDir, 'retired-agent-ids.json'),
  ];
  for (const retiredPath of candidates) {
    if (!existsSync(retiredPath)) continue;
    try {
      const parsed = JSON.parse(readFileSync(retiredPath, 'utf8'));
      const ids = Array.isArray(parsed)
        ? parsed.filter((id) => typeof id === 'string' && id.trim() && !/[\\/]/.test(id))
        : [];
      if (ids.length) return ids;
    } catch {
      console.warn(`[warn] could not parse ${retiredPath}`);
    }
  }
  return [];
}

function pruneRetiredAgents(targetDir, retiredIds) {
  const pruned = [];
  for (const id of retiredIds) {
    for (const suffix of ['.md', '.aionui.json']) {
      const path = join(targetDir, `${id}${suffix}`);
      if (!existsSync(path)) continue;
      unlinkSync(path);
      pruned.push(`${id}${suffix}`);
      console.log(`[prune] ${path}`);
    }
  }
  return pruned;
}
if (fromShippedSeed && !forceMdFlag) {
  console.log('[info] seed/agents source — overwriting existing agent .md files');
}
const gbkPattern = /涓囬紟|鈥|銆|鍒嗘瀽|鎶ヤ环/;

mkdirSync(configDir, { recursive: true });

const deployed = [];
const skipped = [];

const sourceFiles = new Map();
for (const directory of sourceDirs) {
  for (const name of readdirSync(directory).sort()) {
    if (sourceFiles.has(name)) {
      throw new Error(`Duplicate agent seed ${name} in ${directory}`);
    }
    sourceFiles.set(name, join(directory, name));
  }
}

for (const [name, src] of [...sourceFiles].sort(([a], [b]) => a.localeCompare(b))) {
  if (name.toLowerCase() === 'readme.md') continue;
  if (name === 'retired-agent-ids.json') continue;
  const dest = join(configDir, name);
  let shouldCopy = true;

  if (name.endsWith('.md') && existsSync(dest)) {
    if (forceMd) {
      console.log(`[force] ${name} (--force-md)`);
    } else {
      const head = readFileSync(dest, 'utf8').split(/\r?\n/).slice(0, 5).join('\n');
      const descLine = head.split('\n').find((l) => /^description:/.test(l));
      if (descLine && gbkPattern.test(descLine)) {
        console.log(`[fix]  ${name} (GBK corruption detected - force overwrite)`);
      } else {
        skipped.push(name);
        console.log(`[skip] ${name} (user .md exists)`);
        shouldCopy = false;
      }
    }
  }

  if (!shouldCopy) continue;
  copyFileSync(src, dest);
  deployed.push(name);
  console.log(`[ok]   ${name} -> ${dest}`);
}

const pruned = noPruneFlag ? [] : pruneRetiredAgents(configDir, loadRetiredAgentIds());

console.log('');
console.log(`Deployed: ${deployed.length} file(s), skipped: ${skipped.length} .md file(s).`);
if (pruned.length) console.log(`Pruned retired: ${pruned.join(', ')}`);
if (skipped.length) console.log(`Skipped (user wins): ${skipped.join(', ')}`);

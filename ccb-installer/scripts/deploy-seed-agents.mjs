#!/usr/bin/env node
/** Deploy seed agents; mirrors deploy-seed-agents.ps1 including -ForceMd.
 *  When source is install-root seed/agents (hot update / bootstrap), always overwrite .md. */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const installDir = join(scriptDir, '..');
const seedAgentsDir = join(installDir, 'seed', 'agents');
const configAgentsDir = join(installDir, 'config', 'agents');

const explicitSource = process.argv.find((a) => a.startsWith('--source='))?.slice('--source='.length);
let sourceDir = explicitSource ?? null;
if (!sourceDir) {
  if (existsSync(join(seedAgentsDir, 'quotation-agent.md'))) {
    sourceDir = seedAgentsDir;
  } else if (existsSync(configAgentsDir)) {
    sourceDir = configAgentsDir;
  } else {
    throw new Error(`No agent seed source found (checked seed and config/agents under ${installDir})`);
  }
}
const configDir =
  process.argv.find((a) => a.startsWith('--config='))?.slice('--config='.length) ??
  join(process.env.LOCALAPPDATA ?? '', 'CCB-Wanding', '.claude', 'agents');
const forceMdFlag = process.argv.includes('--force-md');
const fromShippedSeed = sourceDir.replace(/\\/g, '/').toLowerCase().endsWith('seed/agents');
const forceMd = forceMdFlag || fromShippedSeed;
if (fromShippedSeed && !forceMdFlag) {
  console.log('[info] seed/agents source — overwriting existing agent .md files');
}
const gbkPattern = /涓囬紟|鈥|銆|鍒嗘瀽|鎶ヤ环/;

mkdirSync(configDir, { recursive: true });

const deployed = [];
const skipped = [];

for (const name of readdirSync(sourceDir).sort()) {
  if (name.toLowerCase() === 'readme.md') continue;
  const src = join(sourceDir, name);
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

console.log('');
console.log(`Deployed: ${deployed.length} file(s), skipped: ${skipped.length} .md file(s).`);
if (skipped.length) console.log(`Skipped (user wins): ${skipped.join(', ')}`);
